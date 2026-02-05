import FormBuilderModelBase from './FormBuilderModelBase';

export type FormBuilderModelBindObjectAfterChangeCallback = (
  object: any,
  upd: { [prop: string]: any },
) => any;
export type FormBuilderModelBindObjectComputed = {
  [prop: string]: {
    get: (object: any) => any;
    set: (object: any, val: any) => void;
  };
};

export default class FormBuilderModelBindObject extends FormBuilderModelBase {
  private _object: Record<string, any>;
  private _afterChange: FormBuilderModelBindObjectAfterChangeCallback | null;
  private _computed: FormBuilderModelBindObjectComputed | null;

  constructor(
    object: Record<string, any>,
    after_change: FormBuilderModelBindObjectAfterChangeCallback | null = null,
    computed: FormBuilderModelBindObjectComputed | null = null,
  ) {
    super();
    this._object = object;
    this._afterChange = after_change;
    this._computed = computed;
  }

  override hasProp(prop: string): boolean {
    if (this._computed && this._computed.hasOwnProperty(prop)) {
      return true;
    }
    return this._object.hasOwnProperty(prop);
  }

  override getValue<T>(prop: string) {
    if (this._computed && this._computed.hasOwnProperty(prop)) {
      return this._computed[prop].get(this._object);
    }
    return this._object[prop] as T;
  }

  override setValues(upd: { [prop: string]: any }) {
    for (const prop in upd) {
      if (!upd.hasOwnProperty(prop)) {
        continue;
      }
      if (this._computed && this._computed.hasOwnProperty(prop)) {
        this._computed[prop].set(this._object, upd[prop]);
      } else {
        this._object[prop] = upd[prop];
      }
    }
    if (this._afterChange) this._afterChange(this._object, upd);
  }
}
