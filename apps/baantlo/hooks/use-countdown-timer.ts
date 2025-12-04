/**
 * Countdown Timer Hook
 *
 * Provides a real-time countdown timer that updates every second until a target timestamp.
 * Returns the remaining time in a formatted string and whether the timer has expired.
 *
 * @module hooks/use-countdown-timer
 */

import { useEffect, useState, useCallback } from 'react';

export type CountdownTimerResult = {
	timeRemaining: string;
	isExpired: boolean;
	secondsRemaining: number;
};

/**
 * Formats seconds into a human-readable countdown string (e.g., "2d 05h 30m 15s")
 * Single-digit hours, minutes, and seconds are padded with a leading zero.
 * Always displays minutes and seconds when time remains, even if they are 00,
 * to ensure the timer remains visible and consistent.
 *
 * @param seconds - Total seconds remaining
 * @returns Formatted countdown string
 */
function formatCountdown(seconds: number): string {
	if (seconds <= 0) {
		return '00m 00s';
	}

	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours.toString().padStart(2, '0')}h`);
	// Always show minutes and seconds when time remains, even if 00
	// This ensures the timer remains visible and doesn't "hide" when minutes/seconds reach 00
	parts.push(`${minutes.toString().padStart(2, '0')}m`);
	parts.push(`${secs.toString().padStart(2, '0')}s`);

	return parts.join(' ');
}

/**
 * Hook that provides a countdown timer for a target timestamp
 *
 * @param targetTimestamp - Unix timestamp (in seconds) to count down to
 * @param enabled - Whether the countdown should be active (default: true)
 * @returns Countdown timer state with formatted time remaining and expiration status
 */
export function useCountdownTimer(
	targetTimestamp: number | null,
	enabled: boolean = true,
): CountdownTimerResult {
	const [timeRemaining, setTimeRemaining] = useState<string>('0s');
	const [isExpired, setIsExpired] = useState<boolean>(false);
	const [secondsRemaining, setSecondsRemaining] = useState<number>(0);

	const updateCountdown = useCallback(() => {
		if (!targetTimestamp || !enabled) {
			setTimeRemaining('0s');
			setIsExpired(true);
			setSecondsRemaining(0);
			return;
		}

		const now = Math.floor(Date.now() / 1000);
		const remaining = targetTimestamp - now;

		if (remaining <= 0) {
			setTimeRemaining('0s');
			setIsExpired(true);
			setSecondsRemaining(0);
		} else {
			setTimeRemaining(formatCountdown(remaining));
			setIsExpired(false);
			setSecondsRemaining(remaining);
		}
	}, [targetTimestamp, enabled]);

	useEffect(() => {
		if (!targetTimestamp || !enabled) {
			setTimeRemaining('0s');
			setIsExpired(true);
			setSecondsRemaining(0);
			return;
		}

		// Update immediately
		updateCountdown();

		// Update every second
		const interval = setInterval(updateCountdown, 1000);

		return () => clearInterval(interval);
	}, [targetTimestamp, enabled, updateCountdown]);

	return { timeRemaining, isExpired, secondsRemaining };
}

