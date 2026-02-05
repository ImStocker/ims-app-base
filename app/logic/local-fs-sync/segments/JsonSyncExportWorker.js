self.onmessage = (event) => {
  if (!event.data) return;
  if (event.data.name === 'convertCall') {
    try {
      const func = new Function('asset_data', event.data.jscode);
      const res = event.data.assets.map((asset) => func(asset));
      self.postMessage({
        name: 'convertRes',
        id: event.data.id,
        error: null,
        result: res,
      });
    } catch (err) {
      self.postMessage({
        name: 'convertRes',
        id: event.data.id,
        error: err,
        result: [],
      });
    }
  }
};
