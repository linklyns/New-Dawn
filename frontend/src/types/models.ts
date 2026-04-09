export interface Safehouse {
  safehouseId: number;
  safehouseCode: string;
  name: string;
  region: string;
  city: string;
  province: string;
  country: string;
  openDate: string;
  status: string;
  capacityGirls: number;
  capacityStaff: number;
  currentOccupancy: number;
  notes: string | null;
}

export interface Resident {
  residentId: number;
  caseControlNo: string;
  internalCode: string;
  safehouseId: number;
  caseStatus: string;
  sex: string;
  dateOfBirth: string;
  birthStatus: string;
  placeOfBirth: string;
  religion: string | null;
  caseCategory: string;
  subCatOrphaned: boolean;
  subCatTrafficked: boolean;
  subCatChildLabor: boolean;
  subCatPhysicalAbuse: boolean;
  subCatSexualAbuse: boolean;
  subCatOsaec: boolean;
  subCatCicl: boolean;
  subCatAtRisk: boolean;
  subCatStreetChild: boolean;
  subCatChildWithHiv: boolean;
  isPwd: boolean;
  pwdType: string | null;
  hasSpecialNeeds: boolean;
  specialNeedsDiagnosis: string | null;
  familyIs4ps: boolean;
  familySoloParent: boolean;
  familyIndigenous: boolean;
  familyParentPwd: boolean;
  familyInformalSettler: boolean;
  dateOfAdmission: string;
  ageUponAdmission: string;
  presentAge: string;
  lengthOfStay: string;
  referralSource: string;
  referringAgencyPerson: string | null;
  dateColbRegistered: string | null;
  dateColbObtained: string | null;
  assignedSocialWorker: string;
  initialCaseAssessment: string | null;
  dateCaseStudyPrepared: string | null;
  reintegrationType: string | null;
  reintegrationStatus: string | null;
  initialRiskLevel: string;
  currentRiskLevel: string;
  dateEnrolled: string;
  dateClosed: string | null;
  createdAt: string;
  notesRestricted: string | null;
}

export interface Supporter {
  supporterId: number;
  supporterType: string;
  displayName: string;
  organizationName: string | null;
  firstName: string;
  lastName: string;
  relationshipType: string;
  region: string;
  country: string;
  email: string;
  phone: string;
  status: string;
  createdAt: string;
  firstDonationDate: string;
  acquisitionChannel: string;
}

export interface Donation {
  donationId: number;
  supporterId: number;
  donationType: string;
  donationDate: string;
  isRecurring: boolean;
  campaignName: string | null;
  channelSource: string;
  currencyCode: string | null;
  amount: number | null;
  estimatedValue: number;
  impactUnit: string;
  notes: string | null;
  referralPostId: number | null;
}

export interface DonationAllocation {
  allocationId: number;
  donationId: number;
  safehouseId: number;
  programArea: string;
  amountAllocated: number;
  allocationDate: string;
  allocationNotes: string | null;
}

export interface SocialMediaPost {
  postId: number;
  platform: string;
  platformPostId: string;
  postUrl: string;
  createdAt: string;
  dayOfWeek: string;
  postHour: number;
  postType: string;
  mediaType: string | null;
  caption: string;
  hashtags: string | null;
  numHashtags: number;
  mentionsCount: number;
  hasCallToAction: boolean;
  callToActionType: string | null;
  contentTopic: string;
  sentimentTone: string;
  captionLength: number;
  featuresResidentStory: boolean;
  campaignName: string | null;
  isBoosted: boolean;
  boostBudgetPhp: number | null;
  impressions: number;
  reach: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clickThroughs: number;
  videoViews: number | null;
  engagementRate: number;
  profileVisits: number;
  donationReferrals: number;
  estimatedDonationValuePhp: number;
  followerCountAtPost: number;
  watchTimeSeconds: number | null;
  avgViewDurationSeconds: number | null;
  subscriberCountAtPost: number | null;
  forwards: number | null;
}

export interface SocialMediaDraftChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SocialMediaDraftMedia {
  mediaId: number;
  fileName: string;
  contentType: string;
  mediaKind: string;
  fileSizeBytes: number;
  uploadedAt: string;
}

export interface SocialMediaDraftSummary {
  draftId: number;
  title: string;
  stage: string;
  status: string;
  platform: string;
  mediaType: string;
  contentTopic: string;
  sentimentTone: string;
  updatedAt: string;
  mediaCount: number;
}

export interface SocialMediaDraft {
  draftId: number;
  title: string;
  stage: string;
  status: string;
  platform: string;
  postType: string;
  mediaType: string;
  callToActionType: string;
  contentTopic: string;
  sentimentTone: string;
  hashtags: string;
  audience: string;
  campaignName: string;
  additionalInstructions: string;
  headline: string;
  body: string;
  ctaText: string;
  websiteUrl: string;
  scheduledDay: string | null;
  scheduledHour: number | null;
  chatHistory: SocialMediaDraftChatMessage[];
  mediaItems: SocialMediaDraftMedia[];
  createdAt: string;
  updatedAt: string;
}

export interface ProcessRecording {
  recordingId: number;
  residentId: number;
  sessionDate: string;
  socialWorker: string;
  sessionType: string;
  sessionDurationMinutes: number;
  emotionalStateObserved: string;
  emotionalStateEnd: string;
  sessionNarrative: string;
  interventionsApplied: string;
  followUpActions: string;
  progressNoted: boolean;
  concernsFlagged: boolean;
  referralMade: boolean;
  notesRestricted: string | null;
}

export interface HomeVisitation {
  visitationId: number;
  residentId: number;
  visitDate: string;
  socialWorker: string;
  visitType: string;
  locationVisited: string;
  familyMembersPresent: string;
  purpose: string;
  observations: string;
  familyCooperationLevel: string;
  safetyConcernsNoted: boolean;
  followUpNeeded: boolean;
  followUpNotes: string | null;
  visitOutcome: string;
}

export interface EducationRecord {
  educationRecordId: number;
  residentId: number;
  recordDate: string;
  educationLevel: string;
  schoolName: string;
  enrollmentStatus: string;
  attendanceRate: number;
  progressPercent: number;
  completionStatus: string;
  notes: string;
}

export interface HealthWellbeingRecord {
  healthRecordId: number;
  residentId: number;
  recordDate: string;
  generalHealthScore: number;
  nutritionScore: number;
  sleepQualityScore: number;
  energyLevelScore: number;
  heightCm: number;
  weightKg: number;
  bmi: number;
  medicalCheckupDone: boolean;
  dentalCheckupDone: boolean;
  psychologicalCheckupDone: boolean;
  notes: string;
}

export interface InterventionPlan {
  planId: number;
  residentId: number;
  planCategory: string;
  planDescription: string;
  servicesProvided: string;
  targetValue: number;
  targetDate: string;
  status: string;
  caseConferenceDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentReport {
  incidentId: number;
  residentId: number;
  safehouseId: number;
  incidentDate: string;
  incidentType: string;
  severity: string;
  description: string;
  responseTaken: string;
  resolved: boolean;
  resolutionDate: string | null;
  reportedBy: string;
  followUpRequired: boolean;
}

export interface InKindDonationItem {
  itemId: number;
  donationId: number;
  itemName: string;
  itemCategory: string;
  quantity: number;
  unitOfMeasure: string;
  estimatedUnitValue: number;
  intendedUse: string;
  receivedCondition: string;
}

export interface Partner {
  partnerId: number;
  partnerName: string;
  partnerType: string;
  roleType: string;
  contactName: string;
  email: string;
  phone: string;
  region: string;
  status: string;
  startDate: string;
  endDate: string | null;
  notes: string;
}

export interface PartnerAssignment {
  assignmentId: number;
  partnerId: number;
  safehouseId: number | null;
  programArea: string;
  assignmentStart: string;
  assignmentEnd: string | null;
  responsibilityNotes: string;
  isPrimary: boolean;
  status: string;
}

export interface SafehouseMonthlyMetric {
  metricId: number;
  safehouseId: number;
  monthStart: string;
  monthEnd: string;
  activeResidents: number;
  avgEducationProgress: number | null;
  avgHealthScore: number | null;
  processRecordingCount: number;
  homeVisitationCount: number;
  incidentCount: number;
  notes: string | null;
}

export interface PublicImpactSnapshot {
  snapshotId: number;
  snapshotDate: string;
  headline: string;
  summaryText: string;
  metricPayloadJson: string;
  isPublished: boolean;
  publishedAt: string;
}
