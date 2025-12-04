/**
 * Rating Modal
 * Appears after marking content as "Watched" in Discover
 * Supports half-star ratings (0.5 increments from 0.5 to 5 stars)
 */

import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Star } from 'lucide-react-native';

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

  const handleStarPress = (starIndex: number, event: any) => {
    // Detect which half of the star was tapped
    const { locationX } = event.nativeEvent;
    const isLeftHalf = locationX < 20; // Half of 40px star width

    const newRating = isLeftHalf ? starIndex - 0.5 : starIndex;
    setRating(newRating);
  };

  const renderStar = (starIndex: number) => {
    const isFull = rating >= starIndex;
    const isHalf = rating >= starIndex - 0.5 && rating < starIndex;

    return (
      <TouchableOpacity
        key={starIndex}
        style={styles.starButton}
        onPress={(event) => handleStarPress(starIndex, event)}
        activeOpacity={0.7}
      >
        {isFull ? (
          <Star size={40} fill="#FFD700" color="#FFD700" />
        ) : isHalf ? (
          <View style={styles.halfStarContainer}>
            <View style={styles.halfStarLeft}>
              <Star size={40} fill="#FFD700" color="#FFD700" />
            </View>
            <View style={styles.halfStarRight}>
              <Star size={40} fill="transparent" color="#444" />
            </View>
          </View>
        ) : (
          <Star size={40} fill="transparent" color="#444" />
        )}
      </TouchableOpacity>
    );
  };

  const handleSubmit = () => {
    if (rating > 0) {
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
  starButton: {
    padding: 4,
  },
  halfStarContainer: {
    width: 40,
    height: 40,
    position: 'relative',
  },
  halfStarLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 20,
    overflow: 'hidden',
  },
  halfStarRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 20,
    overflow: 'hidden',
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
