import type {
  RouteLocationNamedRaw,
  RouteLocationRaw,
  Router,
} from 'vue-router';
import type { LangStr } from '../types/ProjectTypes';
import { useRequestURL, useRuntimeConfig } from '#app';
import { unref } from 'vue';
import type { IAppManager } from '../managers/IAppManager';
import UiManager from '../managers/UiManager';
import { createTransliteratedSlug } from '#logic/utils/stringUtils';

export function getProjectSlug(project: ProjectInfoForLink) {
  const res = createTransliteratedSlug(project.title, { from: 0, to: 30 });
  return res.length > 0 ? res : '-';
}

export type ProjectInfoForLink = {
  id: string;
  title: string;
  shortLink?: string | null;
  localPath?: string | null;
};

export function checkMainDomainRoutesAreUsing(): boolean {
  const currentUrl = useRequestURL();
  const conf = useRuntimeConfig();

  return (
    currentUrl.hostname === conf.public.MAIN_DOMAIN ||
    currentUrl.hostname !== conf.public.SHOWCASE_DOMAIN
  );
}

export function checkShowcaseDomainRoutesAreUsing(): boolean {
  const currentUrl = useRequestURL();
  const conf = useRuntimeConfig();
  return currentUrl.hostname === conf.public.SHOWCASE_DOMAIN;
}

export function getShowcaseBaseLink() {
  const currentUrl = useRequestURL();
  const conf = useRuntimeConfig();
  let showcase_domain = conf.public.SHOWCASE_DOMAIN
    ? conf.public.SHOWCASE_DOMAIN
    : conf.public.MAIN_DOMAIN;
  if (!showcase_domain) showcase_domain = currentUrl.hostname;
  return (
    currentUrl.protocol +
    '//' +
    showcase_domain +
    (currentUrl.port ? ':' + currentUrl.port : '')
  );
}

export function getMainBaseLink() {
  const currentUrl = useRequestURL();
  const conf = useRuntimeConfig();
  let main_domain = conf.public.MAIN_DOMAIN;
  if (!main_domain) main_domain = currentUrl.hostname;
  return (
    currentUrl.protocol +
    '//' +
    main_domain +
    (currentUrl.port ? ':' + currentUrl.port : '')
  );
}

export const RoutesWithLangParam = new Set([
  'catalog',
  'space-hubs',
  'space-new',
  'space-my-feed',
  'space-diary',
  'space-hubs',
  'space-jams',
]);

export type ServiceLinkVariants =
  | 'main'
  | 'showcase'
  | 'landing'
  | 'profile'
  | 'notifications'
  | 'sign-up'
  | 'sign-in'
  | 'restore'
  | 'collections-list'
  | 'catalog'
  | 'app-try'
  | 'space-jams';

export function getServiceLink(
  name: ServiceLinkVariants,
  lang: LangStr,
  query?: Record<string, string>,
): RouteLocationRaw {
  const get_result = (
    is_space: boolean,
    route_name: string,
    path: string,
  ): RouteLocationRaw => {
    if (
      (is_space && checkShowcaseDomainRoutesAreUsing()) ||
      (!is_space && checkMainDomainRoutesAreUsing())
    ) {
      const route: RouteLocationRaw = {
        name: route_name,
        ...(query ? { query: query } : {}),
      };
      if (RoutesWithLangParam.has(route_name)) {
        route.params = {
          lang,
        };
      }
      return route;
    } else {
      if (is_space) {
        return getShowcaseBaseLink() + path;
      } else {
        return getMainBaseLink() + path;
      }
    }
  };

  const currentUrl = useRequestURL();
  const conf = useRuntimeConfig();
  switch (name) {
    case 'showcase':
      return get_result(true, 'space', '/');
    case 'profile':
      return get_result(
        false,
        'project-account-personal',
        '/app/account/personal',
      );
    case 'sign-up':
      return get_result(false, 'sign-up', '/app/sign-up');
    case 'sign-in':
      return get_result(false, 'sign-in', '/app/sign-in');
    case 'restore':
      return get_result(false, 'restore', '/app/restore');
    case 'notifications':
      return get_result(false, 'app-notifications', '/app/notifications');
    case 'landing': {
      let landing_domain = conf.public.MAIN_DOMAIN;
      if (!landing_domain) landing_domain = currentUrl.hostname;
      return (
        currentUrl.protocol +
        '//' +
        landing_domain +
        (currentUrl.port ? ':' + currentUrl.port : '') +
        '/'
      );
    }
    case 'catalog':
      return get_result(true, 'catalog', `/${lang}/catalog`);
    case 'collections-list':
      return get_result(true, 'collections-list', `/c/list`);
    case 'main':
      return get_result(false, 'app-main', `/app`);
    case 'app-try':
      return get_result(false, 'app-try', `/app/try`);
    default:
      throw new Error('Unknown service link');
  }
}

export function getProjectLink(
  $router: Router,
  project: ProjectInfoForLink,
  to: RouteLocationNamedRaw,
  preferShortLink = false,
): RouteLocationRaw {
  const currentUrl = useRequestURL();
  const conf = useRuntimeConfig();
  if (checkShowcaseDomainRoutesAreUsing() && !checkMainDomainRoutesAreUsing()) {
    if (project.shortLink) {
      return {
        ...to,
        params: {
          projectShortLink: project.shortLink,
          ...(to.params ? to.params : {}),
        },
      };
    } else {
      const project_link = project.localPath
        ? project.localPath
        : getProjectSlug(project);
      const resolved_link = $router.resolve({
        ...to,
        params: {
          projectShortLink: '-',
          ...(to.params ? to.params : {}),
        },
      }).fullPath;
      let main_domain = conf.public.MAIN_DOMAIN;
      if (!main_domain) main_domain = currentUrl.hostname;
      return (
        currentUrl.protocol +
        '//' +
        main_domain +
        (currentUrl.port ? ':' + currentUrl.port : '') +
        '/app/p/' +
        encodeURIComponent(project.id) +
        '/' +
        encodeURIComponent(project_link) +
        '/' +
        resolved_link.substring(3)
      );
    }
  } else {
    if (preferShortLink && project.shortLink) {
      let showcase_domain = conf.public.SHOWCASE_DOMAIN;
      if (!showcase_domain) showcase_domain = currentUrl.hostname;
      const resolved_link = $router.resolve({
        ...to,
        params: {
          projectId: project.localPath ? '-' : '0',
          projectLink: project.localPath ? project.localPath : '-',
          ...(to.params ? to.params : {}),
        },
      }).fullPath;
      return (
        currentUrl.protocol +
        '//' +
        showcase_domain +
        (currentUrl.port ? ':' + currentUrl.port : '') +
        '/' +
        encodeURIComponent(project.shortLink) +
        '/' +
        resolved_link.substring('/app/p/0/-/'.length)
      );
    } else {
      const project_link = project.localPath
        ? project.localPath
        : getProjectSlug(project);
      return {
        ...to,
        params: {
          projectId: project.localPath ? '-' : project.id,
          projectLink: project_link,
          ...(to.params ? to.params : {}),
        },
      };
    }
  }
}

export function getProjectLinkHref(
  $router: Router,
  project: ProjectInfoForLink,
  to: RouteLocationNamedRaw,
  full = false,
  preferShortLink = false,
) {
  const currentUrl = useRequestURL();
  const link = getProjectLink($router, project, to, preferShortLink);
  if (typeof link === 'string') return link;
  const path = $router.resolve(link).href;
  if (!full) return path;
  return currentUrl.origin + path;
}

export function sanitizeProjectUrl(
  $router: Router,
  project: ProjectInfoForLink,
  url: string,
): string | null {
  const project_protocol = 'project://';
  if (url.startsWith(project_protocol)) {
    if (!project) {
      return null;
    }
    const project_url =
      getProjectLinkHref(
        $router as Router,
        project,
        {
          name: 'project-main',
        },
        true,
      ) + '/';
    const u = new URL(project_url + url.substring(project_protocol.length));
    const simplified = u.protocol + '//' + u.host + u.pathname;
    if (simplified.startsWith(project_url)) return simplified;
  }

  return null;
}

export async function openProjectLink(
  app_manager: IAppManager,
  project: ProjectInfoForLink,
  to: RouteLocationNamedRaw,
  new_tab = false,
): Promise<void> {
  const link = getProjectLink(app_manager.getRouter(), project, to);
  await app_manager.get(UiManager).openLink(link, new_tab);
}

export function getSignInLink(query?: {
  redirect?: string;
  error?: string;
  email?: string;
}) {
  const currentUrl = useRequestURL();
  const conf = useRuntimeConfig();
  if (checkMainDomainRoutesAreUsing()) {
    return {
      name: 'sign-in',
      query,
    };
  } else {
    let main_domain = conf.public.MAIN_DOMAIN;
    if (!main_domain) main_domain = currentUrl.hostname;
    const url = new URL(
      '/app/sign-in',
      currentUrl.protocol +
        '//' +
        main_domain +
        (currentUrl.port ? ':' + currentUrl.port : ''),
    );
    if (query && query.error) {
      url.searchParams.append('error', query.error);
    }
    if (query && query.redirect) {
      url.searchParams.append('redirect', query.redirect);
      if (
        checkShowcaseDomainRoutesAreUsing() &&
        !checkMainDomainRoutesAreUsing()
      ) {
        url.searchParams.append('redirectFromService', 'showcase');
      }
    }
    return url.toString();
  }
}

export async function openSignInLink(
  $router: Router,
  query?: { redirect?: string; error?: string },
  new_tab = false,
): Promise<void> {
  const link = getSignInLink(query);
  if (typeof link === 'string' || new_tab) {
    const link_as_url =
      typeof link === 'string' ? link : $router.resolve(link).fullPath;
    if (new_tab) {
      window.open(link_as_url, '_blank');
    } else {
      window.location.assign(link_as_url);
    }
  } else {
    await $router.push(link);
  }
}

export function getServiceLinkHref(
  $router: Router,
  name: ServiceLinkVariants,
  lang: LangStr,
  query?: Record<string, string>,
  full = false,
) {
  const currentUrl = useRequestURL();
  const link = getServiceLink(name, lang, query);
  if (typeof link === 'string') return link;
  const path = $router.resolve(link).href;
  if (!full) return path;
  return currentUrl.origin + path;
}

export async function openServiceLink(
  $router: Router,
  name: ServiceLinkVariants,
  lang: LangStr,
  query?: Record<string, string>,
  new_tab = false,
): Promise<void> {
  const link = getServiceLink(name, lang, query);
  if (typeof link === 'string' || new_tab) {
    const link_as_url =
      typeof link === 'string' ? link : $router.resolve(link).fullPath;
    if (new_tab) {
      window.open(link_as_url, '_blank');
    } else {
      window.location.assign(link_as_url);
    }
  } else {
    await $router.push(link);
  }
}

export function isSubHrefOfCurrentUrl(
  href: string,
  exact: boolean,
  $router: Router,
): boolean {
  const route = unref($router.currentRoute);
  if (exact) {
    return href === route.fullPath;
  } else {
    return route.fullPath.startsWith(href);
  }
}

export function getCurrentUrl(): URL {
  return useRequestURL();
}
