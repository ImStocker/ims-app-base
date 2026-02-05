import { AppSubManagerBase, type IAppManager } from './IAppManager';
import ApiManager from './ApiManager';
import type {
  CommentReplyChangeDTO,
  CommentCreateDTO,
  CommentCreateResponseDTO,
  CommentReplyDTO,
  GetCommentsParamsDTO,
  GetCommentsResultDTO,
} from '../types/CommentTypes';
import CreatorAssetManager from './CreatorAssetManager';
import { Service, HttpMethods } from './ApiWorker';

export default class CommentManager extends AppSubManagerBase {
  private readonly _apiManager: ApiManager;
  isLoaded = false;

  constructor(app_manager: IAppManager) {
    super(app_manager);
    this._apiManager = app_manager.get(ApiManager);
  }

  async init() {}

  async createComment(
    params: CommentCreateDTO,
  ): Promise<CommentCreateResponseDTO> {
    const res = await this._apiManager.call<any>(
      Service.CREATORS,
      HttpMethods.POST,
      'assets/comment',
      {
        ...params,
      },
    );
    await this.appManager.get(CreatorAssetManager).getAssetInstancesList({
      where: {
        id: [params.assetId],
      },
    });
    return res;
  }

  async addAnswer(
    comment_id: string,
    params: CommentCreateDTO,
  ): Promise<CommentReplyDTO> {
    return await this._apiManager.call<any>(
      Service.CREATORS,
      HttpMethods.POST,
      `assets/comment/${comment_id}/reply`,
      {
        ...params,
      },
    );
  }

  async changeReply(
    comment_id: string,
    reply_id: string,
    params: CommentReplyChangeDTO,
  ): Promise<CommentReplyDTO> {
    return await this._apiManager.call<any>(
      Service.CREATORS,
      HttpMethods.PATCH,
      `assets/comment/${comment_id}/reply/${reply_id}`,
      {
        ...params,
      },
    );
  }

  async deleteReply(comment_id: string, reply_id: string): Promise<void> {
    return await this._apiManager.call<any>(
      Service.CREATORS,
      HttpMethods.DELETE,
      `assets/comment/${comment_id}/reply/${reply_id}`,
    );
  }

  async getComments(
    comment_id: string,
    _params: GetCommentsParamsDTO,
  ): Promise<GetCommentsResultDTO> {
    return await this._apiManager.call<any>(
      Service.CREATORS,
      HttpMethods.GET,
      `assets/comment/${comment_id}/reply`,
    );
  }
}
