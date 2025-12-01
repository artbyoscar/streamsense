import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '@/components';
import type { UserSubscription } from '@/types';
import { getValueContext } from '@/services/subscriptionValue';

interface ValueScore {
    totalWatchHours: number;
    costPerHour: number;
    monthlyCost: number;
}

interface Props {
    subscription: UserSubscription;
    valueScore: ValueScore;
}

export const ValueScoreCard = ({ subscription, valueScore }: Props) => {
    const context = getValueContext(
        valueScore.costPerHour,
        valueScore.totalWatchHours,
        valueScore.monthlyCost
    );

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
                                backgroundColor: context.color,
                            }
                        ]}
                    />
                </View>
                <Text style={styles.meterLabel}>
                    {valueScore.totalWatchHours.toFixed(1)}h watched this month
                </Text>
            </View>

            {/* Value explanation */}
            <View style={styles.valueSection}>
                <MaterialCommunityIcons
                    name={context.icon as any}
                    size={24}
                    color={context.color}
                    style={styles.valueIcon}
                />
                <View style={styles.valueText}>
                    <Text style={styles.valueHeadline}>{context.headline}</Text>
                    <Text style={styles.valueExplanation}>{context.detail}</Text>
                    {context.suggestion && (
                        <Text style={styles.valueComparison}>{context.suggestion}</Text>
                    )}
                </View>
            </View>

            {/* Cost breakdown - only show if meaningful (3+ hours) */}
            {valueScore.totalWatchHours >= 3 && (
                <View style={styles.breakdown}>
                    <Text style={styles.breakdownText}>
                        ${valueScore.monthlyCost.toFixed(2)} ÷ {valueScore.totalWatchHours.toFixed(1)}h =
                        <Text style={[styles.costPerHour, { color: context.color }]}>
                            {' '}${valueScore.costPerHour.toFixed(2)}/hour
                        </Text>
                    </Text>
                </View>
            )}
        </View>
    );
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
        alignItems: 'flex-start',
    },
    valueIcon: {
        marginRight: 12,
        marginTop: 2,
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
    },
});
