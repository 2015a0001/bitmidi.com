// TODO: publish to npm

import pathToRegexp from 'path-to-regexp'
import fromEntries from 'fromentries'

export default class Router {
  constructor (routes) {
    this._routes = routes.map(route => {
      const { name, path, query = {}, canonicalUrl = null } = route
      const keys = []
      const regexp = pathToRegexp(path, keys)
      return { name, path, query, canonicalUrl, keys, regexp }
    })

    this._compilers = {}
    routes.forEach(route => {
      const { name, path } = route
      this._compilers[name] = pathToRegexp.compile(path)
    })
  }

  match (rawUrl) {
    const urlObj = new URL(rawUrl, 'http://example.com')

    for (const route of this._routes) {
      const matches = route.regexp.exec(urlObj.pathname)
      if (!matches) continue

      // Found a matching route
      const name = route.name
      const url = `${urlObj.pathname}${urlObj.search}`

      const params = {}
      matches.slice(1).forEach((paramValue, paramIndex) => {
        const param = route.keys[paramIndex].name
        // Remove URL encoding from the param values. Accommodates whitespace in
        // both x-www-form-urlencoded and regular percent-encoded form.
        params[param] = decodeURIComponent(paramValue.replace(/\+/g, ' '))
      })

      const query = { ...route.query, ...fromEntries(urlObj.searchParams) }

      // Only include whitelisted query params in the canonical url
      for (const key of urlObj.searchParams.keys()) {
        if (!Object.prototype.hasOwnProperty.call(route.query, key)) {
          urlObj.searchParams.delete(key)
        }
      }

      const canonicalUrl = `${urlObj.pathname}${urlObj.search}`

      const loc = {
        name,
        url,
        params,
        query,
        canonicalUrl
      }

      if (route.canonicalUrl) {
        loc.canonicalUrl = route.canonicalUrl(loc)
      }

      return loc
    }

    // This should never be reached because the error route should always match
    throw new Error('No matching route found. Missing an error route?')
  }

  toUrl (name, data) {
    return this._compilers[name](data)
  }
}
