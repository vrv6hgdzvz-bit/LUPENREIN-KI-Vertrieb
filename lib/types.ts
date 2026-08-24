export const STATUSES = ['Neu','Qualifiziert','Kontakt bereit','Kontaktiert','Interessiert','Besichtigung','Angebot','Kunde'] as const
export type LeadStatus = typeof STATUSES[number]

export type WebsiteAnalysis = {
  analyzedAt: string
  mode: 'ai'|'local'
  title: string
  summary: string
  signals: string[]
  recommendedServices: string[]
  businessEmail?: string
  businessPhone?: string
  confidence: number
}

export type Lead = {
  id: string
  company: string
  city: string
  sector: string
  score: number
  service: string
  status: LeadStatus
  contact: string
  email: string
  phone: string
  website?: string
  address?: string
  source?: 'Manuell'|'Google Places'|'Demo Finder'|'Self-Service'
  sourceId?: string
  reason: string
  potential: 'hoch'|'mittel'|'niedrig'
  analysis?: WebsiteAnalysis
  createdAt: string
  updatedAt?: string
}

export const ACTIVITY_TYPES = ['Notiz','E-Mail','Telefonat','Besichtigung','Angebot','Status'] as const
export type ActivityType = typeof ACTIVITY_TYPES[number]
export type ActivityDirection = 'intern'|'eingehend'|'ausgehend'

export type Activity = {
  id: string
  leadId: string
  type: ActivityType
  direction: ActivityDirection
  content: string
  outcome?: string
  createdAt: string
}

export const MESSAGE_STATUSES = ['Entwurf','Freigegeben','Gesendet','Beantwortet','Archiviert'] as const
export type MessageStatus = typeof MESSAGE_STATUSES[number]
export type ReplyIntent = 'interessiert'|'später'|'kein_interesse'|'rückfrage'|'neutral'|'unbekannt'

export type Message = {
  id: string
  leadId: string
  subject: string
  body: string
  to: string
  status: MessageStatus
  provider: 'preview'|'webhook'|'gmail'
  aiMode: 'ai'|'local'
  sentAt?: string
  gmailDraftId?: string
  gmailMessageId?: string
  replyText?: string
  replyIntent?: ReplyIntent
  replySummary?: string
  followUpAt?: string
  createdAt: string
  updatedAt?: string
}

export type FinderCandidate = {
  id: string
  company: string
  city: string
  address: string
  sector: string
  website: string
  phone: string
  source: 'Google Places'|'Demo Finder'
  sourceId: string
  score: number
  service: string
  potential: 'hoch'|'mittel'|'niedrig'
  reason: string
  duplicate: boolean
}

export const TASK_TYPES = ['Follow-up','Anruf','Besichtigung','Angebot','Sonstiges'] as const
export type TaskType = typeof TASK_TYPES[number]
export type TaskStatus = 'Offen'|'Erledigt'
export type Task = {
  id: string
  leadId: string
  title: string
  type: TaskType
  dueAt: string
  status: TaskStatus
  note?: string
  createdAt: string
  completedAt?: string
}

export const OFFER_STATUSES = ['Entwurf','Versendet','Angenommen','Abgelehnt','Abgelaufen'] as const
export type OfferStatus = typeof OFFER_STATUSES[number]
export type OfferBilling = 'einmalig'|'monatlich'
export type OfferItem = {
  id: string
  service: string
  description?: string
  quantity: number
  unit: string
  unitPrice: number
  billing: OfferBilling
}
export type ServiceFrequency = {
  preset: string
  custom?: string
}
export type ServiceSpecificationItem = {
  id: string
  groupId: string
  groupLabel: string
  groupIcon: string
  activityId: string
  activityLabel: string
  shortText: string
  activityIcon?: string
  frequency: ServiceFrequency
}
export type ServiceSpecification = {
  version: number
  items: ServiceSpecificationItem[]
}
export type Offer = {
  id: string
  leadId: string
  surveyId?: string
  number: string
  title: string
  status: OfferStatus
  validUntil: string
  items: OfferItem[]
  serviceSpecification: ServiceSpecification
  notes?: string
  subtotalOneTime: number
  subtotalMonthly: number
  vatRate: number
  sentAt?: string
  acceptedAt?: string
  declinedAt?: string
  gmailDraftId?: string
  createdAt: string
  updatedAt?: string
}

export const SURVEY_STATUSES = ['Entwurf','Besichtigt','Kalkuliert'] as const
export type SurveyStatus = typeof SURVEY_STATUSES[number]
export type SiteSurvey = {
  id: string
  leadId: string
  status: SurveyStatus
  objectName: string
  objectType: string
  address: string
  areaSqm: number
  frequencyPerWeek: number
  hoursPerVisit: number
  workers: number
  windowAreaSqm: number
  restrooms: number
  kitchens: number
  floorType: string
  accessWindow: string
  startDate?: string
  notes?: string
  createdAt: string
  updatedAt?: string
}


export const CUSTOMER_OBJECT_STATUSES = ['Geplant','Aktiv','Pausiert','Beendet'] as const
export type CustomerObjectStatus = typeof CUSTOMER_OBJECT_STATUSES[number]
export type CustomerObject = {
  id: string
  leadId: string
  offerId: string
  surveyId?: string
  status: CustomerObjectStatus
  objectName: string
  objectType: string
  address: string
  service: string
  startDate?: string
  areaSqm: number
  frequencyPerWeek: number
  monthlyRevenue: number
  oneTimeRevenue: number
  contractTermMonths: number
  noticePeriodMonths: number
  notes?: string
  createdAt: string
  updatedAt?: string
}

export const USER_ROLES = ['admin','sales','ops','read_only'] as const
export type UserRole = typeof USER_ROLES[number]
export type UserProfile = {
  userId: string
  email: string
  displayName: string
  role: UserRole
  createdAt: string
  updatedAt?: string
}

export type AuditEvent = {
  id: string
  action: string
  entityType: string
  entityId?: string
  summary: string
  metadata?: Record<string,unknown>
  createdAt: string
}

export type AgentRunStatus = 'Läuft'|'Erfolgreich'|'Fehler'
export type AgentRun = {
  id: string
  status: AgentRunStatus
  leadsReviewed: number
  tasksCreated: number
  hotLeads: number
  summary: string
  startedAt: string
  finishedAt?: string
}

export type AgentRecommendation = {
  leadId: string
  company: string
  score: number
  reason: string
  taskType: TaskType
  taskTitle: string
  dueAt: string
}

