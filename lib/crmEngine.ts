

import { Interaction, InteractionType, InteractionOutcome, RelationshipStage } from '../types';

export interface EngagementMetrics {
    score: number; // 0-100
    stage: RelationshipStage;
    nextAction: string;
}

/**
 * Calculates the engagement health score based on Recency, Frequency, and Sentiment.
 * Formula: Score = (Recency * 0.4) + (Frequency * 0.3) + (Sentiment * 0.3)
 */
export const calculateEngagementScore = (interactions: Interaction[]): EngagementMetrics => {
    const now = new Date();
    if (interactions.length === 0) {
        return { score: 0, stage: RelationshipStage.NEW, nextAction: 'Schedule Initial Visit' };
    }

    // Sort by date descending
    const sorted = [...interactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastInteraction = sorted[0];

    // 1. Recency Score (0-100)
    // 100 if visited within 14 days, 0 if > 90 days
    const daysSinceLast = (now.getTime() - new Date(lastInteraction.date).getTime()) / (1000 * 60 * 60 * 24);
    let recencyScore = 0;
    if (daysSinceLast <= 14) recencyScore = 100;
    else if (daysSinceLast > 90) recencyScore = 0;
    else recencyScore = 100 - ((daysSinceLast - 14) / (90 - 14)) * 100;

    // 2. Frequency Score (0-100)
    // 100 if > 5 interactions in last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);
    const recentCount = interactions.filter(i => new Date(i.date) > sixMonthsAgo).length;
    const frequencyScore = Math.min(recentCount * 20, 100);

    // 3. Sentiment Score (0-100)
    // Derived from outcome
    let sentimentTotal = 0;
    let sentimentCount = 0;
    interactions.forEach(i => {
        if (i.outcome === InteractionOutcome.POSITIVE) sentimentTotal += 100;
        else if (i.outcome === InteractionOutcome.NEUTRAL) sentimentTotal += 50;
        else if (i.outcome === InteractionOutcome.NEGATIVE) sentimentTotal += 0;
        // Requires Follow Up is neutral for sentiment
        if (i.outcome !== InteractionOutcome.REQUIRES_FOLLOW_UP) sentimentCount++;
    });
    const sentimentScore = sentimentCount > 0 ? sentimentTotal / sentimentCount : 50;

    // Final Score
    const finalScore = Math.round((recencyScore * 0.4) + (frequencyScore * 0.3) + (sentimentScore * 0.3));

    // Determine Stage
    let stage = RelationshipStage.ACTIVE;
    if (interactions.length === 1 && daysSinceLast < 30) stage = RelationshipStage.ONBOARDING;
    else if (daysSinceLast > 60 || sentimentScore < 30) stage = RelationshipStage.AT_RISK;
    else if (finalScore > 80) stage = RelationshipStage.ADVOCATE;

    // Determine Next Action
    let nextAction = 'Routine Check-in';
    if (stage === RelationshipStage.AT_RISK) nextAction = 'Urgent Retention Visit';
    if (stage === RelationshipStage.ONBOARDING) nextAction = 'Verify Plantation';
    if (lastInteraction.outcome === InteractionOutcome.REQUIRES_FOLLOW_UP) nextAction = 'Resolve Pending Issue';

    return { score: finalScore, stage, nextAction };
};