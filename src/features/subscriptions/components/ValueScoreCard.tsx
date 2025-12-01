import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { COLORS } from '@/components';
import type { UserSubscription } from '@/types';

interface ValueScore {
    totalWatchHours: number;
    costPerHour: number;
    rating: 'excellent' | 'good' | 'poor' | 'unknown';
}

interface Props {
    subscription: UserSubscription;
    valueScore: ValueScore;
}

export const ValueScoreCard = ({ subscription, valueScore }: Props) => {
    const getValueExplanation = (costPerHour: number, rating: string) => {
        if (rating === 'unknown') {
            return {
                headline: 'Start tracking',
                explanation: 'Log your watch time to see if this subscription is worth it',
                icon: '❓',
                comparison: undefined,
            };
        }

        if (rating === 'excellent') {
            return {
                headline: 'Excellent value!',
                explanation: `Each hour of entertainment costs you less than 50¢`,
                comparison: `That is cheaper than a cup of coffee per movie night`,
                icon: '🌟',
            };
        }

        if (rating === 'good') {
            return {
                headline: 'Good value',
                explanation: `You are paying $${costPerHour.toFixed(2)} for each hour of content`,
                comparison: `Watch ${Math.ceil(2 / costPerHour)} more hours this month to hit excellent value`,
                icon: '✅',
            };
        }

        // Poor value
        return {
            headline: 'Consider your usage',
            explanation: `At $${costPerHour.toFixed(2)}/hour, you might save money renting individual titles`,
            comparison: `Watch ${Math.ceil(subscription.price / 0.50)} hours to make this worthwhile`,
            icon: '⚠️',
        };
    };

    const valueInfo = getValueExplanation(valueScore.costPerHour, valueScore.rating);

    return (
        <View style={styles.card}>
            <View style={styles.header}>
                <Text style={styles.serviceName}>{subscription.service_name}</Text>
                <Text style={styles.price}>${subscription.price}/mo</Text>
            </View>

            {/* Visual meter */}
            <View style={styles.meterContainer}>
                <View style={styles.meterBackground}>
                    <View
                        style={[
                            styles.meterFill,
                            {
                                width: `${Math.min(100, (valueScore.totalWatchHours / 20) * 100)}%`,
                                backgroundColor: getColorForRating(valueScore.rating),
                            }
                        ]}
                    />
                </View>
                <Text style={styles.meterLabel}>
                    {valueScore.totalWatchHours}h watched this month
                </Text>
            </View>

            {/* Value explanation */}
            <View style={styles.valueSection}>
                <Text style={styles.valueIcon}>{valueInfo.icon}</Text>
                <View style={styles.valueText}>
                    <Text style={styles.valueHeadline}>{valueInfo.headline}</Text>
                    <Text style={styles.valueExplanation}>{valueInfo.explanation}</Text>
                    {valueInfo.comparison && (
                        <Text style={styles.valueComparison}>{valueInfo.comparison}</Text>
                    )}
                </View>
            </View>

            {/* Cost breakdown */}
            {valueScore.rating !== 'unknown' && (
                <View style={styles.breakdown}>
                    <Text style={styles.breakdownText}>
                        ${subscription.price} ÷ {valueScore.totalWatchHours}h =
                        <Text style={styles.costPerHour}> ${valueScore.costPerHour.toFixed(2)}/hour</Text>
                    </Text>
                </View>
            )}
        </View>
    );
};

const getColorForRating = (rating: string) => {
    switch (rating) {
        case 'excellent': return '#22c55e';  // Green
        case 'good': return '#84cc16';       // Light green
        case 'poor': return '#f97316';       // Orange
        default: return '#6b7280';           // Gray
    }
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    serviceName: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    price: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    meterContainer: {
        marginBottom: 16,
    },
    meterBackground: {
        height: 8,
        backgroundColor: COLORS.border,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    meterFill: {
        height: '100%',
        borderRadius: 4,
    },
    meterLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        textAlign: 'right',
    },
    valueSection: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    valueIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    valueText: {
        flex: 1,
    },
    valueHeadline: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 4,
    },
    valueExplanation: {
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 4,
        lineHeight: 20,
    },
    valueComparison: {
        fontSize: 12,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },
    breakdown: {
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        paddingTop: 12,
        alignItems: 'center',
    },
    breakdownText: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    costPerHour: {
        fontWeight: '700',
        color: COLORS.text,
    },
});
