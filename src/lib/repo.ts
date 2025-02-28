import {APIClient} from '@heroku-cli/command'

type BuildMetadata = {
    app: {
        id: string,
        name: string,
    },
    cache_delete_url: string,
    cache_get_url: string,
    cache_put_url: string,
    repo_delete_url: string,
    repo_get_url: string,
    repo_put_url: string,
}
async function getRelease(appName: string, herokuAPI: APIClient) {
  const {body: release} = await herokuAPI.get<BuildMetadata>(`/apps/${appName}/build-metadata`, {
    headers: {
      Accept: 'application/vnd.heroku+json; version=3.sdk',
    },
  })
  return release
}

export async function getURL(appName: string, herokuAPI: APIClient) {
  const release = await getRelease(appName, herokuAPI)
  return release.repo_get_url
}

export async function putURL(appName: string, herokuAPI: APIClient) {
  const release = await getRelease(appName, herokuAPI)
  return release.repo_put_url
}
