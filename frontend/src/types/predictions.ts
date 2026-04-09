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
  hasCallToAction: string;
  featuresResidentStory: string;
  isBosted: string;
  boostBudgetPhpBin: string;
  predictedDonationReferrals: number;
  predictedEstimatedDonationValuePhp: number;
  predictedForwards: number;
  predictedProfileVisits: number;
  predictedEngagementRate: number;
  predictedImpressions: number;
}

export const PREDICTION_FEATURE_DESCRIPTIONS: Record<string, string> = {
  predictedDonationReferrals: 'Number of donations attributed to this post',
  predictedEstimatedDonationValuePhp: 'Estimated total PHP value of donations referred by this post',
  predictedForwards: 'Message forwards — personal referrals with high donation conversion rates',
  predictedProfileVisits: 'Number of profile visits attributed to this post',
  predictedEngagementRate: 'Engagement rate: (likes + comments + shares) / reach',
  predictedImpressions: 'Total number of times the post was displayed',
};

export interface BestPostingTime {
  platform: string;
  postType: string;
  mediaType: string;
  contentTopic: string;
  sentimentTone: string;
  callToActionType: string;
  hasCallToAction: string;
  featuresResidentStory: string;
  isBosted: string;
  boostBudgetPhpBin: string;
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
  riskScoreMax: number;
  predictedRiskLevel: string;
  confidence: string;
  topRiskFactor1: string;
  topRiskFactor2: string;
}
