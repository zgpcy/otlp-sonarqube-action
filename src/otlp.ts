import { Resource } from '@opentelemetry/resources'
import * as opentelemetry from '@opentelemetry/api'
import * as core from '@actions/core'
import {
  MeterProvider,
  PeriodicExportingMetricReader
} from '@opentelemetry/sdk-metrics'
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions'
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http'
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api'
import { OtlpConfig, OtlpMetric } from './types'

let otlpConfig: OtlpConfig
let meter: any
let meterProvider: MeterProvider

// Optional and only needed to see the internal diagnostic logging (during development)
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.DEBUG)

export const initializeOTLP = (config: OtlpConfig): void => {
  const RESOURCE = Resource.default().merge(
    new Resource({
      [ATTR_SERVICE_NAME]: config.serviceName,
      [ATTR_SERVICE_VERSION]: config.serviceVersion
    })
  )

  const metricExporter = new OTLPMetricExporter({
    url: `${config.endpoint}/v1/metrics`,
    concurrencyLimit: 1
  })

  const reader = new PeriodicExportingMetricReader({
    exporter: metricExporter
  })
  meterProvider = new MeterProvider({
    resource: RESOURCE,
    readers: [reader]
  })

  opentelemetry.metrics.setGlobalMeterProvider(meterProvider)

  meter = opentelemetry.metrics.getMeter(
    config.serviceName,
    config.serviceVersion
  )
  core.debug(`Using Resource: ${RESOURCE}`)
  core.debug(`Using metricExporter: ${metricExporter}`)
  otlpConfig = config
}

export const sendMetrics = async (metrics: OtlpMetric[]): Promise<void> => {
  core.debug('Sending metrics to OTLP')
  metrics.forEach(data => {
    const m = meter.createGauge(`${otlpConfig.metricNamespace}.${data.name}`, {
      description: data.description,
      unit: '1'
    })
    m.record(data.value, data.labels)
    core.debug(`Recorded metric: ${data.name}=${data.value}`)
  })
  await meterProvider.forceFlush()
}
