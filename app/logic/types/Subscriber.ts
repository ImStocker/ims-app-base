export type SubscriberHandler = {
  unsubscribe: () => void;
};

export default class Subscriber<T extends any[]> {
  private readonly _subscribers: ((...args: T) => any)[];

  constructor() {
    this._subscribers = [];
  }

  subscribe(callback: (...args: T) => any): SubscriberHandler {
    this._subscribers.push(callback);
    return {
      unsubscribe: () => {
        const ind = this._subscribers.indexOf(callback);
        if (ind >= 0) this._subscribers.splice(ind, 1);
      },
    };
  }

  async notify(...args: T) {
    await Promise.all(
      this._subscribers.map(async (cb) => {
        try {
          await cb(...args);
        } catch (e) {
          console.error('Subscriber uncaught', e);
        }
      }),
    );
  }
}
