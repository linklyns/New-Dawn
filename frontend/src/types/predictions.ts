// ML pipeline prediction types — maps to backend DTOs

export interface SupporterLikelihood {
  supporterId: number;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  likelihoodScore: number;
  likelihoodCategory: string;
  totalDonationAmount: number;
  donationCount: number;
  daysSinceLastDonation: number;
  topReason1: string;
  topReason2: string;
}

export interface MlSocialPostPrediction {
  platform: string;
  postType: string;
  mediaType: string;
  contentTopic: string;
  sentimentTone: string;
  callToActionType: string;
  predictedDonationReferrals: number;
  predictedEstimatedDonationValuePhp: number;
  predictedForwards: number;
  predictedProfileVisits: number;
  predictedEngagementRate: number;
  predictedImpressions: number;
}

export interface BestPostingTime {
  dayOfWeek: string;
  postHour: number;
  predictedEstimatedDonationValuePhp: number;
  rank: number;
  historicalPostCount: number;
  confidenceIndicator: string;
}

export interface ReintegrationFactor {
  feature: string;
  coefficient: number;
  oddsRatio: number;
  pValue: number;
  significanceFlag: string;
  effectDirection: string;
  plainLanguageInterpretation: string;
}

export interface RiskPrediction {
  residentId: number;
  internalCode: string;
  caseControlNo: string;
  predictedRiskScore: number;
  predictedRiskLevel: string;
  confidence: string;
  topRiskFactor1: string;
  topRiskFactor2: string;
}
