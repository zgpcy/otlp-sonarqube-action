import * as core from '@actions/core'
import { initializeOTLP, sendMetrics } from './otlp'
import SonarQube from './sonarqube'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    const otlpEndpoint: string = core.getInput('endpoint')
    const headers: string = core.getInput('headers')
    const prefixes: string = core.getInput('prefixes')
    const metricNamespace: string =
      core.getInput('metricNamespace') ||
      process.env.OTLP_METRIC_NAMESPACE ||
      ''
    const otlpServiceNameAttr =
      core.getInput('serviceNameAttr') ||
      process.env.OTLP_SERVICE_NAME_ATTR ||
      ''
    const otlpServiceVersionAttr =
      core.getInput('serviceVersionAttr') ||
      process.env.OTLP_SERVICE_VERSION_ATTR ||
      ''

    const sonarqubeEndpoint: string =
      core.getInput('sonarqubeEndpoint') || process.env.SONARQUBE_URL || ''
    const token: string =
      core.getInput('sonarqubeToken') || process.env.SONARQUBE_TOKEN || ''

    initializeOTLP({
      endpoint: otlpEndpoint,
      headers: headers,
      metricNamespace: metricNamespace,
      serviceName: otlpServiceNameAttr,
      serviceVersion: otlpServiceVersionAttr
    })

    const sq = new SonarQube(sonarqubeEndpoint, token, prefixes.split(','))
    const metrics = await sq.getSecurityHotspotsMetrics()
    await sendMetrics(metrics)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
