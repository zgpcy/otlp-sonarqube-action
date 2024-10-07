import { OtlpMetric, SecurityHotspot, SonarQubeProject } from './types'

export default class SonarQube {
  private requestHeaders: Headers = new Headers()
  readonly url: string
  private prefixes: string[] = []

  public constructor(url: string, token: string, prefixes: string[] = []) {
    this.url = url
    this.prefixes = prefixes
    this.requestHeaders.set('Content-Type', 'application/json')
    this.requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  private getAllProjects = async (
    prefixes: string[]
  ): Promise<SonarQubeProject[]> => {
    let pageIndex = 1
    const sonarQubeProjects: SonarQubeProject[] = []
    while (true) {
      // Query params encoded
      const queryParams = new URLSearchParams().set('p', pageIndex.toString())
      const response = await fetch(
        this.url + '/api/projects/search?' + queryParams,
        { headers: this.requestHeaders }
      )
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const data = await response.json()
      const total = data.paging.total

      for (let i = 0; i < data.components.length; i++) {
        const key = data.components[i].key
        if (
          prefixes.length > 0 &&
          !prefixes.some(prefix => key.startsWith(prefix))
        ) {
          continue
        }
        const name = key.split('_')
        const owner = name[0]
        const repository = name[1]
        sonarQubeProjects.push({ key, owner, repository })
      }

      if (pageIndex * data.paging.pageSize >= total) {
        break
      }
      pageIndex++
    }

    return sonarQubeProjects
  }

  private getSecurityHotspots = async (
    projectKey: string,
    owner: string,
    repository: string
  ): Promise<SecurityHotspot[]> => {
    let pageIndex = 1
    const hotspotsResult: SecurityHotspot[] = []
    while (true) {
      // Query params encoded
      const queryParams = new URLSearchParams()
      queryParams.set('projectKey', projectKey)
      queryParams.set('p', pageIndex.toString())
      const response = await fetch(
        this.url + '/api/hotspots/search?' + queryParams,
        { headers: this.requestHeaders }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const pageSize = data.paging.pageSize
      const total = data.paging.total
      data.hotspots.forEach((hotspot: any) => {
        const hp: SecurityHotspot = {
          key: hotspot.key,
          component: hotspot.component,
          securityCategory: hotspot.securityCategory,
          vulnerabilityProbability: hotspot.vulnerabilityProbability,
          message: hotspot.message,
          owner: owner,
          repository: repository,
          link: this.url + '/security_hotspots?id=' + projectKey
        }
        hotspotsResult.push(hp)
      })

      if (pageIndex * pageSize >= total) {
        break
      }
      pageIndex++
    }

    return hotspotsResult
  }

  public getSecurityHotspotsMetrics = async (): Promise<OtlpMetric[]> => {
    const otlpMetrics: OtlpMetric[] = []
    const projects = await this.getAllProjects(this.prefixes)
    for (const project of projects) {
      const hotspots = await this.getSecurityHotspots(
        project.key,
        project.owner,
        project.repository
      )
      for (const hotspot of hotspots) {
        const otlpMetric: OtlpMetric = {
          name: 'hotspot.detected',
          description: 'the security hotspot detected',
          unit: 'securityhotspot',
          labels: {
            key: hotspot.key,
            owner: hotspot.owner,
            repository: hotspot.repository,
            component: hotspot.component,
            securityCategory: hotspot.securityCategory,
            vulnerabilityProbability: hotspot.vulnerabilityProbability,
            message: hotspot.message,
            link: hotspot.link
          },
          value: 1
        }
        otlpMetrics.push(otlpMetric)
      }
    }
    return otlpMetrics
  }
}
