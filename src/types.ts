export interface OtlpMetric {
  name: string
  description: string
  value: number
  unit: string
  labels: Record<string, string>
}

export interface OtlpConfig {
  endpoint: string
  headers: string
  metricNamespace: string
  serviceName: string
  serviceVersion: string
}

export interface SonarQubeProject {
  key: string
  owner: string
  repository: string
}

export interface SecurityHotspot {
  key: string
  owner: string
  repository: string
  component: string
  securityCategory: string
  vulnerabilityProbability: string
  message: string
  link: string
}
