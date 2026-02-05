export default abstract class FormBuilderModelBase {
  hasProp(prop: string): boolean {
    const val = this.getValue<any>(prop);
    return val !== undefined;
  }

  getValue<T>(_prop: string): T | undefined {
    return undefined;
  }

  setValue<T>(prop: string, value: T) {
    this.setValues({ [prop]: value });
  }

  setValues(_upd: { [prop: string]: any }) {}
}
