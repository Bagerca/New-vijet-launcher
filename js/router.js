export class Router {
  constructor(routes, store, renderLayout) {
    this.routes = routes;
    this.store = store;
    this.renderLayout = renderLayout;
    this.currentViewObj = null;

    window.addEventListener('hashchange', () => this.handleHash());
  }

  parseHash(hash) {
    const rawHash = hash || '#/home';
    const [path, queryPart] = rawHash.split('?');
    
    const params = {};
    if (queryPart) {
      const urlParams = new URLSearchParams(queryPart);
      for (const [key, value] of urlParams.entries()) {
        params[key] = value;
      }
    }
    
    return { path: path || '#/home', params };
  }

  handleHash() {
    const { path, params } = this.parseHash(window.location.hash);
    const ViewConfig = this.routes[path] || this.routes['#/home'];

    if (this.currentViewObj && this.currentViewObj.unmount) {
      try { this.currentViewObj.unmount(); } catch (e) { console.error('Unmount Error:', e); }
    }

    this.renderLayout(path, ViewConfig, params, this.store.getState());

    if (ViewConfig.mount) {
      setTimeout(() => { 
        try { ViewConfig.mount(params, this.store.getState()); } 
        catch (e) { console.error('Mount Error:', e); }
      }, 0);
    }

    this.currentViewObj = ViewConfig;
  }

  init() {
    if (!window.location.hash) window.location.hash = '#/home';
    else this.handleHash();
  }
}