import { AppSubManagerBase } from './IAppManager';
import {
  ApiWorker,
  type HttpMethods,
  Service,
  type AuthTokenInfo,
  type IApiTokenStorage,
  type HttpRequestParams,
} from './ApiWorker';

import { assert } from '../utils/typeUtils';
import axios, { type AxiosRequestConfig } from 'axios';
import { useRequestEvent } from '#app';
import { getRequestIP } from 'h3';

export default class ApiManager extends AppSubManagerBase {
  protected _apiWorker: ApiWorker | null = null;

  async init(tokenStorage: IApiTokenStorage) {
    const services = {
      [Service.LEGACY_API]: '',
      [Service.AUTH]: this.appManager.$env.AUTH_API_HOST ?? '/',
      [Service.CREATORS]: this.appManager.$env.CREATORS_API_HOST ?? '/',
      [Service.FILE_STORAGE]: this.appManager.$env.FILE_STORAGE_API_HOST ?? '/',
      [Service.SUPERVISOR]: this.appManager.$env.SUPERVISOR_API_HOST ?? '/',
      [Service.GAME_MANAGER]: this.appManager.$env.GAMEMANAGER_API_HOST ?? '/',
      [Service.SPACE]: this.appManager.$env.SPACE_API_HOST ?? '/',
    };

    this._apiWorker = new ApiWorker(
      tokenStorage,

      this.appManager.$env.DEBUG_SKIP_TOKEN_REFRESH_AND_CHECK,
      (request: HttpRequestParams) => {
        const base_url = services[request.service];
        if (!base_url) throw new Error('Unknown service: ' + request.service);

        const onUploadProgress = request.onUploadProgress;
        const axiosParams: AxiosRequestConfig = {
          method: request.method,
          url: base_url + request.endpoint,
          data: request.data,
          params: request.params,
          headers: request.headers,
          responseType: request.responseType,
          validateStatus: () => true,
          onUploadProgress: onUploadProgress
            ? (p) => onUploadProgress(p)
            : undefined,
        };
        if (import.meta.server) {
          this.appManager.runWithContext(() => {
            const event = useRequestEvent();
            if (event) {
              if (!axiosParams.headers) axiosParams.headers = {};
              const ip = getRequestIP(event);
              const forwardedIp = event.headers.get('X-Forwarded-For');
              if (ip) {
                axiosParams.headers['X-Real-IP'] = ip;
              }
              if (forwardedIp) {
                axiosParams.headers['X-Forwarded-For'] = forwardedIp;
              }
            }
          });
        }
        return axios(axiosParams);
      },
    );
  }

  setCurrentProjectId(project_id: string | null) {
    assert(this._apiWorker, 'ApiWorker was not inited');
    this._apiWorker.setCurrentProjectId(project_id);
  }

  getCurrentProjectId() {
    assert(this._apiWorker, 'ApiWorker was not inited');
    return this._apiWorker.getCurrentProjectId();
  }

  async call<T>(
    service: Service,
    method: HttpMethods,
    endpoint: string,
    params: any = null,
    paramsQuery: any = null,
  ): Promise<T> {
    assert(this._apiWorker, 'ApiWorker was not inited');
    return await this._apiWorker.call<T>(
      service,
      method,
      endpoint,
      params,
      paramsQuery,
    );
  }

  async upload<T>(
    service: Service,
    method: HttpMethods,
    endpoint: string,
    params: any,
    progressCallback?: (percent: number) => void,
  ): Promise<T> {
    assert(this._apiWorker, 'ApiWorker was not inited');
    return this._apiWorker.upload(
      service,
      method,
      endpoint,
      params,
      progressCallback,
    );
  }

  async download(
    service: Service,
    method: HttpMethods,
    endpoint: string,
    params?: any,
  ): Promise<ArrayBuffer> {
    assert(this._apiWorker, 'ApiWorker was not inited');
    return this._apiWorker.download(service, method, endpoint, params);
  }

  getAccessToken(): string | undefined {
    assert(this._apiWorker, 'ApiWorker was not inited');
    return this._apiWorker.getAccessToken();
  }

  async getRefreshToken(): Promise<string | undefined> {
    assert(this._apiWorker, 'ApiWorker was not inited');
    return this._apiWorker.getRefreshToken();
  }

  getRemember(): boolean {
    assert(this._apiWorker, 'ApiWorker was not inited');
    return this._apiWorker.getRemember();
  }

  async setToken(
    token: string | undefined,
    refreshToken: string | undefined,
    remember: boolean,
  ) {
    assert(this._apiWorker, 'ApiWorker was not inited');
    return this._apiWorker.setToken(token, refreshToken, remember);
  }

  async forceRefreshToken(): Promise<boolean> {
    assert(this._apiWorker, 'ApiWorker was not inited');
    return this._apiWorker.forceRefreshToken();
  }

  async removeToken() {
    assert(this._apiWorker, 'ApiWorker was not inited');
    return this._apiWorker.removeToken();
  }

  async getTokenOrRefresh(): Promise<string | undefined> {
    assert(this._apiWorker, 'ApiWorker was not inited');
    return this._apiWorker.getTokenOrRefresh();
  }

  getTokenInfo(): AuthTokenInfo | undefined {
    assert(this._apiWorker, 'ApiWorker was not inited');
    return this._apiWorker.getTokenInfo();
  }

  async ensureValidTokenInfo(): Promise<AuthTokenInfo | undefined> {
    assert(this._apiWorker, 'ApiWorker was not inited');
    return this._apiWorker.ensureValidTokenInfo();
  }
}
