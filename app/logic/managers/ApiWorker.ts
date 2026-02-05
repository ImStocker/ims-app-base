import { decodeTokenInfo, type BaseTokenInfo } from '../utils/tokenUtils';
import ApiError, { ApiErrorCodes } from '../types/ApiError';
import ApiFloodError from '../types/ApiFloodError';
import ApiUnauthorizedError from '../types/ApiUnauthorizedError';
import { decodeBufferToString } from '../utils/dataUtils';

export enum HttpMethods {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
}

export enum Service {
  LEGACY_API = 'legacy_api',
  AUTH = 'auth',
  CREATORS = 'creators',
  SUPERVISOR = 'supervisor',
  FILE_STORAGE = 'filestorage',
  GAME_MANAGER = 'gamemanager',
  SPACE = 'space',
}

type AuthTokenInfoCache = {
  info: AuthTokenInfo | undefined;
  token: string | undefined;
};

export type TokenMainSavedData = {
  userId: string | undefined;
  accessToken: string | undefined;
  remember: boolean;
};

export type TokenRefreshSavedData = {
  userId: string | undefined;
  refreshToken: string | undefined;
};

export type AuthTokenInfo = BaseTokenInfo & {
  id: number;
  email: string;
  language: string;
  licenses: string[];
  name: string;
};

export type IApiTokenStorage = {
  getMain(): TokenMainSavedData;
  getRefreshToken(): Promise<string | undefined>;
  save(main: TokenMainSavedData, token: string | undefined): Promise<void>;
  clear(): Promise<void>;
};

export type HttpRequestParams = {
  service: Service;
  method: HttpMethods;
  endpoint: string;
  data?: any;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  responseType?: 'arraybuffer' | 'json';
  onUploadProgress?: (e: { loaded: number; total?: number }) => void;
};

const MAX_REPEAT_AWAIT = 10;
const MIN_DELAY_BETWEEN_QUERY = 30;
const REFRESH_TOKEN_ATTEMPTS = 10;

export class ApiWorker {
  private _tokenInfoCache: AuthTokenInfoCache | null = null;
  private _tokenMainSavedData: TokenMainSavedData | null = null;
  private _lastQueryTime: number | null = null;
  private _currentProjectId: string | null = null;
  private _tokenStorage: IApiTokenStorage | null = null;
  private _sendRequestFunc: (request: HttpRequestParams) => any;
  private _doRefreshTokenTask: Promise<boolean> | null = null;

  public debugSkipTokenAndRefresh = false;

  constructor(
    tokenStorage: IApiTokenStorage | null,
    debug_skip_token_and_refresh: string,
    send_request: (request: HttpRequestParams) => any,
  ) {
    this._tokenStorage = tokenStorage;
    this.debugSkipTokenAndRefresh = !!debug_skip_token_and_refresh;
    this._sendRequestFunc = send_request;
  }

  setCurrentProjectId(project_id: string | null) {
    this._currentProjectId = project_id;
  }

  getCurrentProjectId() {
    return this._currentProjectId;
  }

  private async _awaitQueryDelay() {
    while (true) {
      const now = Date.now();
      if (
        this._lastQueryTime === null ||
        now - this._lastQueryTime > MIN_DELAY_BETWEEN_QUERY
      ) {
        this._lastQueryTime = now;
        break;
      } else {
        await new Promise((res) => {
          const delay =
            this._lastQueryTime === null ? 1 : now - this._lastQueryTime + 1;
          setTimeout(res, delay);
        });
      }
    }
  }
  private _getTokenStorage(): IApiTokenStorage {
    if (!this._tokenStorage) {
      throw new Error('Token storage is not set');
    }
    return this._tokenStorage;
  }

  private _getMainTokenData(): TokenMainSavedData {
    const cookies = this._getTokenStorage();
    if (!import.meta.server || !this._tokenMainSavedData) {
      // NOTE:
      // На клиенте
      // - берем всегда из cookie, на случай, если работают в нескольких вкладках
      // - переменная нужна для реактивности
      // На сервере:
      // - кэшируем, т.к. после установки токена в куки, они еще не доступны
      const token_data = cookies.getMain();
      if (
        !this._tokenMainSavedData ||
        this._tokenMainSavedData.accessToken !== token_data.accessToken ||
        this._tokenMainSavedData.remember !== token_data.remember ||
        this._tokenMainSavedData.userId !== token_data.userId
      ) {
        this._tokenMainSavedData = token_data;
      }
    }
    return this._tokenMainSavedData;
  }

  private async _setTokenData(
    data: TokenMainSavedData,
    refreshToken: string | undefined,
  ) {
    this._tokenMainSavedData = {
      ...this._tokenMainSavedData,
      ...data,
    };
    const cookies = this._getTokenStorage();
    await cookies.save(this._tokenMainSavedData, refreshToken);
  }

  private async _clearTokens() {
    await this._getTokenStorage().clear();
    this._tokenMainSavedData = {
      accessToken: undefined,
      remember: false,
      userId: undefined,
    };
  }

  private async _callLegacyApi<T>(endpoint: string, params: any): Promise<T> {
    // Query delay
    await this._awaitQueryDelay();

    // Call
    const callParams = params ? { ...params } : {};
    callParams['target'] = 'site';
    callParams['id_language'] = 1;
    const res = await this._sendRequestFunc({
      service: Service.LEGACY_API,
      method: HttpMethods.POST,
      endpoint,
      data: callParams,
    });

    // Check
    if (res.data.error) {
      if (res.data.error.code === 'API_FLOOD') {
        const repeat_in = res.data.error.repeat_in;

        if (repeat_in <= MAX_REPEAT_AWAIT) {
          await new Promise((res) => setTimeout(res, repeat_in * 1000));
          // REPEAT
          return await this._callLegacyApi(endpoint, params);
        }

        throw new ApiFloodError(res.data.error.message, repeat_in);
      }
      throw new Error(res.data.error.message);
    }

    return res.data.res;
  }

  private async _call<T>(
    service: Service,
    method: HttpMethods,
    endpoint: string,
    params: any,
    paramsQuery: Record<string, string>,
    options?: Partial<HttpRequestParams>,
    wasRefreshed: boolean = false,
  ): Promise<T> {
    // Query delay
    await this._awaitQueryDelay();

    if (service === Service.LEGACY_API) {
      return this._callLegacyApi(endpoint, params);
    }

    const token = await this.getTokenOrRefresh();
    const requestParams: HttpRequestParams = {
      service,
      method,
      endpoint,
      ...(options ?? {}),
    };
    if (params) {
      if (method === HttpMethods.GET) {
        requestParams.params = params;
      } else {
        requestParams.data = params;
      }
    }
    if (paramsQuery) {
      requestParams.params = {
        ...(requestParams.params ? requestParams.params : {}),
        ...paramsQuery,
      };
    }
    if (this._currentProjectId && requestParams.params?.pid === undefined) {
      if (service !== Service.FILE_STORAGE) {
        if (!requestParams.params) requestParams.params = {};
        requestParams.params.pid = this._currentProjectId;
      }
    }
    if (token) {
      requestParams.headers = {
        Authorization: `Bearer ${token}`,
      };
    }

    const res = await this._sendRequestFunc(requestParams);
    if (res.status !== 200 && res.status !== 201) {
      let errorObject;
      if (requestParams.responseType === 'arraybuffer') {
        const resStr = decodeBufferToString(res.data);
        errorObject = JSON.parse(resStr);
      } else {
        errorObject = res.data;
      }
      if (res.status === 401 /* || errorObject === 'Unauthorized' */) {
        if (!wasRefreshed && (await this._doRefreshToken())) {
          return await this._call(
            service,
            method,
            endpoint,
            params,
            paramsQuery,
            options,
            true,
          );
        }
        throw new ApiUnauthorizedError(
          errorObject.message,
          ApiErrorCodes.ACCESS_DENIED,
          {
            status: res.status,
          },
        );
      }
      if (!errorObject.message) {
        errorObject = {
          message: JSON.stringify(errorObject),
          code: 'SERVER_ERROR',
          payload: null,
        };
      }
      throw new ApiError(
        errorObject.message,
        errorObject.code,
        errorObject.payload,
      );
    }
    return res.data as T;
  }

  async call<T>(
    service: Service,
    method: HttpMethods,
    endpoint: string,
    params: any = null,
    paramsQuery: any = null,
  ): Promise<T> {
    const res = await this._call<T>(
      service,
      method,
      endpoint,
      params,
      paramsQuery,
    );
    return res;
  }

  async upload<T>(
    service: Service,
    method: HttpMethods,
    endpoint: string,
    params: any,
    progressCallback?: (percent: number) => void,
  ): Promise<T> {
    if (method === 'GET') {
      throw new Error('Cannot upload using GET method');
    }
    const formData = new FormData();
    for (const key in params) {
      if (!params.hasOwnProperty(key)) {
        continue;
      }
      if (
        params[key] &&
        typeof params[key] === 'object' &&
        params[key].blob &&
        params[key].filename
      ) {
        formData.append(key, params[key].blob, params[key].filename);
      } else {
        formData.append(key, params[key]);
      }
    }

    const res = await this._call<{ result: T }>(
      service,
      method,
      endpoint,
      formData,
      {},
      {
        onUploadProgress(e) {
          if (progressCallback && e.total) {
            progressCallback(e.loaded / e.total);
          }
        },
      },
    );
    return res.result;
  }

  async download(
    service: Service,
    method: HttpMethods,
    endpoint: string,
    params?: Record<string, any>,
  ): Promise<ArrayBuffer> {
    return await this._call<ArrayBuffer>(
      service,
      method,
      endpoint,
      params,
      {},
      {
        responseType: 'arraybuffer',
      },
    );
  }

  getAccessToken(): string | undefined {
    return this._getMainTokenData().accessToken;
  }

  async getRefreshToken(): Promise<string | undefined> {
    const cookies = this._getTokenStorage();
    return cookies.getRefreshToken();
  }

  getRemember(): boolean {
    return this._getMainTokenData().remember;
  }

  async setToken(
    token: string | undefined,
    refreshToken: string | undefined,
    remember: boolean,
  ) {
    let userId: string | undefined = undefined;
    if (refreshToken) {
      userId = refreshToken.split(':')[0];
    }
    await this._setTokenData(
      {
        accessToken: token,
        remember,
        userId,
      },
      refreshToken,
    );
    this._tokenInfoCache = null;
  }

  async forceRefreshToken(): Promise<boolean> {
    return await this._doRefreshToken();
  }

  async removeToken() {
    this._tokenInfoCache = null;
    await this._clearTokens();
  }

  async getTokenOrRefresh(): Promise<string | undefined> {
    const curTokenInfo = this.getTokenInfo();
    return await this._refreshTokenIfNeed(curTokenInfo);
  }

  private async _refreshTokenIfNeed(
    tokenInfo: AuthTokenInfo | undefined,
  ): Promise<string | undefined> {
    if (!this.debugSkipTokenAndRefresh) {
      if (!tokenInfo || tokenInfo.exp * 1000 < Date.now()) {
        const refreshed = await this._doRefreshToken();
        if (refreshed) {
          return this.getAccessToken();
        } else {
          if (tokenInfo) {
            await this._clearTokens();
          }
          return undefined;
        }
      }
    }
    return this.getAccessToken();
  }

  getTokenInfo(): AuthTokenInfo | undefined {
    const token = this.getAccessToken();
    if (this._tokenInfoCache && this._tokenInfoCache.token !== token) {
      this._tokenInfoCache = null;
    }
    if (!this._tokenInfoCache) {
      this._tokenInfoCache = {
        token,
        info: token ? this._decodeTokenInfo(token) : undefined,
      };
    }
    return this._tokenInfoCache.info ? this._tokenInfoCache.info : undefined;
  }

  async ensureValidTokenInfo(): Promise<AuthTokenInfo | undefined> {
    const oldTokenInfo = this.getTokenInfo();
    await this._refreshTokenIfNeed(oldTokenInfo);
    return this.getTokenInfo();
  }

  private async _doRefreshTokenImpl(): Promise<boolean> {
    const refreshToken = await this.getRefreshToken();
    if (!refreshToken) {
      return false;
    }
    let attempt = 0;
    while (true) {
      attempt++;
      try {
        const res = await this._sendRequestFunc({
          service: Service.AUTH,
          method: HttpMethods.POST,
          endpoint: 'auth/refresh',
          data: {
            refreshToken,
          },
        });
        const remember = this.getRemember();
        await this.setToken(
          res.data.accessToken,
          res.data.refreshToken,
          remember,
        );
        return true;
      } catch (err: any) {
        const errMessage = err instanceof Error ? err.message : err;
        console.error('ApiManager', '_doRefreshToken', attempt, errMessage);
        if (err.response && err.response.status === 400) {
          // Bad token
          await this.removeToken();
          return false;
        }
        if (attempt >= REFRESH_TOKEN_ATTEMPTS) {
          throw err;
        } else {
          await new Promise((r) => setTimeout(r, attempt * 500));
        }
      }
    }
  }

  private async _doRefreshToken(): Promise<boolean> {
    if (!this._doRefreshTokenTask) {
      this._doRefreshTokenTask = this._doRefreshTokenImpl().finally(() => {
        this._doRefreshTokenTask = null;
      });
    }
    return await this._doRefreshTokenTask;
  }

  private _decodeTokenInfo(token: string): AuthTokenInfo | undefined {
    try {
      return decodeTokenInfo<AuthTokenInfo>(token);
    } catch (err) {
      const errMessage = err instanceof Error ? err.message : err;
      console.error('ApiManager', '_decodeTokenInfo', errMessage);
      return undefined;
    }
  }
}
