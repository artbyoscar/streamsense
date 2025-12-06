/**
 * Rating Modal
 * Appears after marking content as "Watched" in Discover
 * Supports half-star ratings (0.5 increments from 0.5 to 5 stars)
 */

import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Star, StarHalf } from 'lucide-react-native';

interface RatingModalProps {
  visible: boolean;
  contentTitle: string;
  onSubmit: (rating: number) => void;
  onSkip: () => void;
}

export const RatingModal: React.FC<RatingModalProps> = ({
  visible,
  contentTitle,
  onSubmit,
  onSkip,
}) => {
  const [rating, setRating] = useState<number>(0);

  const renderStar = (starIndex: number) => {
    const isFull = rating >= starIndex;
    const isHalf = rating >= starIndex - 0.5 && rating < starIndex;

    return (
      <View key={starIndex} style={styles.starContainer}>
        {/* LEFT HALF - tap for X.5 rating */}
        <TouchableOpacity
          style={styles.halfTouchTarget}
          onPress={() => {
            const newRating = starIndex - 0.5;
            console.log('[Rating] Half star pressed:', newRating);
            setRating(newRating);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.leftHalf}>
            {isHalf ? (
              <StarHalf size={36} fill="#FFD700" color="#FFD700" />
            ) : isFull ? (
              <Star size={36} fill="#FFD700" color="#FFD700" />
            ) : (
              <Star size={36} color="#555" fill="transparent" />
            )}
          </View>
        </TouchableOpacity>

        {/* RIGHT HALF - tap for X.0 rating */}
        <TouchableOpacity
          style={styles.halfTouchTarget}
          onPress={() => {
            console.log('[Rating] Full star pressed:', starIndex);
            setRating(starIndex);
          }}
          activeOpacity={0.7}
        >
          <View style={styles.rightHalf}>
            {isFull ? (
              <Star size={36} fill="#FFD700" color="#FFD700" />
            ) : (
              <Star size={36} color="#555" fill="transparent" />
            )}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const handleSubmit = () => {
    if (rating > 0) {
      console.log('[RatingModal] Submitting rating:', rating, 'type:', typeof rating);
      onSubmit(rating);
      setRating(0); // Reset for next use
    }
  };

  const handleSkip = () => {
    onSkip();
    setRating(0);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>How was it?</Text>
          <Text style={styles.contentTitle} numberOfLines={2}>
            {contentTitle}
          </Text>

          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map(renderStar)}
          </View>

          <Text style={styles.ratingText}>
            {rating > 0 ? `${rating} / 5 stars` : 'Tap left/right on stars for half ratings'}
          </Text>

          <View style={styles.buttons}>
            <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              style={[styles.submitBtn, rating === 0 && styles.submitBtnDisabled]}
              disabled={rating === 0}
            >
              <Text style={styles.submitText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    backgroundColor: '#1a1a1a',
    borderRadius: 20,
    padding: 28,
    width: '88%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  contentTitle: {
    fontSize: 16,
    color: '#aaa',
    marginBottom: 28,
    textAlign: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  starContainer: {
    flexDirection: 'row',
    marginHorizontal: 4,
  },
  halfTouchTarget: {
    width: 20,
    height: 44,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  leftHalf: {
    width: 40,
  },
  rightHalf: {
    width: 40,
    marginLeft: -20,
  },
  ratingText: {
    fontSize: 13,
    color: '#888',
    marginBottom: 28,
    textAlign: 'center',
    minHeight: 36,
  },
  buttons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  skipBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#444',
    alignItems: 'center',
  },
  skipText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    backgroundColor: '#a78bfa',
    alignItems: 'center',
  },
  submitBtnDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
