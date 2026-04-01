import PluginControllerBase from './PluginControllerBase';
export type PublicPluginApi = {
  $t: (key: string) => string;
};

export default abstract class PluginControllerExternal extends PluginControllerBase {
  abstract getPublicPluginApi(): PublicPluginApi;
}
