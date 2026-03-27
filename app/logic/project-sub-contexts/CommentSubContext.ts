import ApiManager from '../managers/ApiManager';
import type {
  CommentReplyChangeDTO,
  CommentCreateDTO,
  CommentCreateResponseDTO,
  CommentReplyDTO,
  GetCommentsParamsDTO,
  GetCommentsResultDTO,
  SetLikeDTO,
} from '../types/CommentTypes';
import { Service, HttpMethods } from '../managers/ApiWorker';
import {
  ProjectSubContext,
  type IProjectContext,
} from '#logic/types/IProjectContext';
import { AssetSubContext } from './AssetSubContext';

export default class CommentSubContext extends ProjectSubContext {
  declare projectContext: IProjectContext; // To fix TS errors in app projects

  // To fix TS errors in app projects
  // eslint-disable-next-line @typescript-eslint/no-useless-constructor
  constructor(projectContext: IProjectContext) {
    super(projectContext);
  }

  isLoaded = false;

  async init() {}

  async createComment(
    params: CommentCreateDTO,
  ): Promise<CommentCreateResponseDTO> {
    const res = await this.projectContext.appManager
      .get(ApiManager)
      .call<CommentCreateResponseDTO>(
        Service.CREATORS,
        HttpMethods.POST,
        'assets/comment',
        params,
        {
          pid: this.projectContext.projectInfo.id,
        },
      );
    await this.projectContext.get(AssetSubContext).getAssetInstancesList({
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
    return await this.projectContext.appManager
      .get(ApiManager)
      .call<CommentReplyDTO>(
        Service.CREATORS,
        HttpMethods.POST,
        `assets/comment/${comment_id}/reply`,
        params,
        {
          pid: this.projectContext.projectInfo.id,
        },
      );
  }

  async changeReply(
    comment_id: string,
    reply_id: string,
    params: CommentReplyChangeDTO,
  ): Promise<CommentReplyDTO> {
    return await this.projectContext.appManager.get(ApiManager).call<any>(
      Service.CREATORS,
      HttpMethods.PATCH,
      `assets/comment/${comment_id}/reply/${reply_id}`,
      {
        ...params,
      },
      {
        pid: this.projectContext.projectInfo.id,
      },
    );
  }

  async setLike(
    comment_id: string,
    reply_id: string,
    params: SetLikeDTO,
  ): Promise<void> {
    await this.projectContext.appManager.get(ApiManager).call(
      Service.CREATORS,
      HttpMethods.POST,
      `assets/comment/${comment_id}/reply/${reply_id}/like`,
      {
        ...params,
      },
      {
        pid: this.projectContext.projectInfo.id,
      },
    );
  }

  async deleteReply(comment_id: string, reply_id: string): Promise<void> {
    await this.projectContext.appManager.get(ApiManager).call(
      Service.CREATORS,
      HttpMethods.DELETE,
      `assets/comment/${comment_id}/reply/${reply_id}`,
      {},
      {
        pid: this.projectContext.projectInfo.id,
      },
    );
  }

  async getComments(
    comment_id: string,
    _params: GetCommentsParamsDTO,
  ): Promise<GetCommentsResultDTO> {
    return await this.projectContext.appManager
      .get(ApiManager)
      .call<GetCommentsResultDTO>(
        Service.CREATORS,
        HttpMethods.GET,
        `assets/comment/${comment_id}/reply`,
        {
          pid: this.projectContext.projectInfo.id,
        },
      );
  }
}
