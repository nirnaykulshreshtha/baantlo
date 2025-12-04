/**
 * Countdown Timer Component
 *
 * Reusable countdown timer component that displays a formatted countdown until a target timestamp.
 * Supports customizable styling, badges, icons, and expired state handling.
 *
 * Aggressive logging: Emits render traces when timer state changes.
 *
 * @module components/common/countdown-timer
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useCountdownTimer } from '@/hooks/use-countdown-timer';
import { cn } from '@/lib/utils';
import { Clock } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type CountdownTimerProps = {
	/**
	 * Unix timestamp (in seconds) to count down to
	 */
	targetTimestamp: number | null;
	/**
	 * Whether the countdown should be active
	 */
	enabled?: boolean;
	/**
	 * Text to display when timer expires (default: "Closed")
	 */
	expiredText?: string;
	/**
	 * Badge to show when timer is active (optional)
	 */
	activeBadge?: React.ReactNode;
	/**
	 * Icon to display next to the timer (optional)
	 */
	icon?: LucideIcon;
	/**
	 * Custom className for the timer text
	 */
	className?: string;
	/**
	 * Custom className for the expired state
	 */
	expiredClassName?: string;
	/**
	 * Custom className for the active state
	 */
	activeClassName?: string;
	/**
	 * Size variant for the timer text
	 */
	size?: 'sm' | 'md' | 'lg' | 'xl';
	/**
	 * Whether to show the icon
	 */
	showIcon?: boolean;
	/**
	 * Format variant: "human" for "2d 05h 30m 15s" or "time" for "HH:MM:SS"
	 */
	format?: 'human' | 'time';
	/**
	 * Whether to animate number changes (default: true)
	 */
	animate?: boolean;
};

const sizeClasses = {
	sm: 'text-sm',
	md: 'text-base',
	lg: 'text-xl',
	xl: 'text-2xl',
};

/**
 * Countdown Timer Component
 *
 * Displays a real-time countdown timer that updates every second until expiration.
 * Supports custom styling, badges, icons, format variants, and optional slide animations
 * for number changes.
 *
 * @param targetTimestamp - Unix timestamp (in seconds) to count down to
 * @param enabled - Whether the countdown should be active (default: true)
 * @param expiredText - Text to display when timer expires (default: "Closed")
 * @param activeBadge - Badge to show when timer is active (optional)
 * @param icon - Icon to display next to the timer (optional)
 * @param className - Custom className for the timer text
 * @param expiredClassName - Custom className for the expired state
 * @param activeClassName - Custom className for the active state
 * @param size - Size variant for the timer text
 * @param showIcon - Whether to show the icon
 * @param format - Format variant: "human" for "2d 05h 30m 15s" or "time" for "HH:MM:SS" (default: "human")
 * @param animate - Whether to animate number changes with slide effect (default: true)
 */
/**
 * Formats seconds into HH:MM:SS format for compact display
 */
function formatTimeCountdown(seconds: number): string {
	if (seconds <= 0) {
		return '00:00:00';
	}

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

const SLIDE_DURATION_MS = 320;

type TimeUnitKey = 'days' | 'hours' | 'minutes' | 'seconds';

type HumanSegment = {
	key: TimeUnitKey;
	value: string;
	suffix: string;
	maxValue?: number;
};

type ClockSegment =
	| { type: 'separator'; text: string }
	| { type: 'unit'; key: Exclude<TimeUnitKey, 'days'>; value: string; maxValue?: number };

function getHumanSegments(secondsRemaining: number): HumanSegment[] {
	const safeSeconds = Math.max(secondsRemaining, 0);
	const days = Math.floor(safeSeconds / 86400);
	const hours = Math.floor((safeSeconds % 86400) / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	const seconds = safeSeconds % 60;

	const segments: HumanSegment[] = [];

	if (days > 0) {
		segments.push({ key: 'days', value: String(days), suffix: 'd' });
	}
	if (hours > 0 || days > 0) {
		segments.push({
			key: 'hours',
			value: hours.toString().padStart(2, '0'),
			suffix: 'h',
			maxValue: days > 0 ? 23 : undefined,
		});
	}
	segments.push({
		key: 'minutes',
		value: minutes.toString().padStart(2, '0'),
		suffix: 'm',
		maxValue: 59,
	});
	segments.push({
		key: 'seconds',
		value: seconds.toString().padStart(2, '0'),
		suffix: 's',
		maxValue: 59,
	});

	return segments;
}

function getClockSegments(secondsRemaining: number): ClockSegment[] {
	const safeSeconds = Math.max(secondsRemaining, 0);
	const hours = Math.floor(safeSeconds / 3600);
	const minutes = Math.floor((safeSeconds % 3600) / 60);
	const seconds = safeSeconds % 60;

	return [
		{ type: 'unit', key: 'hours', value: hours.toString().padStart(2, '0') },
		{ type: 'separator', text: ':' },
		{
			type: 'unit',
			key: 'minutes',
			value: minutes.toString().padStart(2, '0'),
			maxValue: 59,
		},
		{ type: 'separator', text: ':' },
		{
			type: 'unit',
			key: 'seconds',
			value: seconds.toString().padStart(2, '0'),
			maxValue: 59,
		},
	];
}

type AnimatedUnitProps = {
	value: string;
	trend: 'up' | 'down';
	maxValue?: number;
	animate?: boolean;
};

function AnimatedUnit({ value, trend, maxValue, animate = true }: AnimatedUnitProps) {
	const [stableValue, setStableValue] = useState(value);
	const [incomingValue, setIncomingValue] = useState<string | null>(null);
	const [direction, setDirection] = useState<'up' | 'down'>('down');

	useEffect(() => {
		if (!animate) {
			setStableValue(value);
			setIncomingValue(null);
			return;
		}

		if (value === stableValue) {
			return;
		}

		const incomingNumeric = parseInt(value, 10);
		const stableNumeric = parseInt(stableValue, 10);
		let nextDirection: 'up' | 'down' = trend;

		if (!Number.isNaN(incomingNumeric) && !Number.isNaN(stableNumeric)) {
			if (
				typeof maxValue === 'number' &&
				trend === 'down' &&
				stableNumeric === 0 &&
				incomingNumeric === maxValue
			) {
				nextDirection = 'down';
			} else if (
				typeof maxValue === 'number' &&
				trend === 'up' &&
				stableNumeric === maxValue &&
				incomingNumeric === 0
			) {
				nextDirection = 'up';
			} else if (incomingNumeric > stableNumeric) {
				nextDirection = 'up';
			} else if (incomingNumeric < stableNumeric) {
				nextDirection = 'down';
			}
		}

		setDirection(nextDirection);
		setIncomingValue(value);
		const timeout = setTimeout(() => {
			setStableValue(value);
			setIncomingValue(null);
		}, SLIDE_DURATION_MS);

		return () => clearTimeout(timeout);
	}, [value, stableValue, trend, maxValue, animate]);

	const outgoingClass =
		direction === 'up' ? 'countdown-number--out-up' : 'countdown-number--out-down';
	const incomingClass =
		direction === 'up' ? 'countdown-number--in-up' : 'countdown-number--in-down';

	// If animation is disabled, just render the value directly
	if (!animate) {
		return <span className="countdown-number">{value}</span>;
	}

	return (
		<span className="countdown-number-wrapper" aria-hidden="true">
			{/* Placeholder to maintain wrapper size */}
			<span className="countdown-number countdown-number--placeholder" aria-hidden="true">
				{stableValue}
			</span>
			{/* Outgoing value */}
			<span
				className={cn(
					'countdown-number',
					incomingValue ? outgoingClass : 'countdown-number--stable',
				)}
			>
				{stableValue}
			</span>
			{/* Incoming value */}
			{incomingValue && (
				<span className={cn('countdown-number', incomingClass)}>{incomingValue}</span>
			)}
		</span>
	);
}

export function CountdownTimer({
	targetTimestamp,
	enabled = true,
	expiredText = 'Closed',
	activeBadge,
	icon: Icon,
	className,
	expiredClassName,
	activeClassName,
	size = 'lg',
	showIcon = false,
	format = 'human',
	animate = true,
}: CountdownTimerProps) {
	const countdown = useCountdownTimer(targetTimestamp, enabled);
	const prevSecondsRef = useRef<number | null>(null);
	const trendRef = useRef<'up' | 'down'>('down');

	useEffect(() => {
		const prevSeconds = prevSecondsRef.current;
		if (prevSeconds !== null && prevSeconds !== countdown.secondsRemaining) {
			trendRef.current = countdown.secondsRemaining > prevSeconds ? 'up' : 'down';
		}
		prevSecondsRef.current = countdown.secondsRemaining;
	}, [countdown.secondsRemaining]);

	const trend = trendRef.current;

	const isExpired = countdown.isExpired;
	const displayText = isExpired
		? expiredText
		: format === 'time'
			? formatTimeCountdown(countdown.secondsRemaining)
			: countdown.timeRemaining;

	const timerClassName = cn(
		'font-display font-semibold whitespace-nowrap',
		sizeClasses[size],
		isExpired
			? cn('text-muted-foreground', expiredClassName)
			: cn('text-foreground', activeClassName),
		className,
	);

	const humanCountdown = () => {
		const segments = getHumanSegments(countdown.secondsRemaining);
		return (
			<span className="inline-flex items-baseline gap-2">
				{segments.map((segment) => (
					<span key={segment.key} className="inline-flex items-baseline gap-1">
						<AnimatedUnit
							value={segment.value}
							trend={trend}
							maxValue={segment.maxValue}
							animate={animate}
						/>
						<span>{segment.suffix}</span>
					</span>
				))}
			</span>
		);
	};

	const clockCountdown = () => {
		const segments = getClockSegments(countdown.secondsRemaining);
		return (
			<span className="inline-flex items-baseline">
				{segments.map((segment, index) =>
					segment.type === 'separator' ? (
						<span key={`sep-${index}`} className="px-1">
							{segment.text}
						</span>
					) : (
						<AnimatedUnit
							key={segment.key}
							value={segment.value}
							trend={trend}
							maxValue={segment.maxValue}
							animate={animate}
						/>
					),
				)}
			</span>
		);
	};

	const timerContent = isExpired ? (
		<span>{expiredText}</span>
	) : format === 'time' ? (
		clockCountdown()
	) : (
		humanCountdown()
	);

	return (
		<div className="flex items-center gap-2">
			{showIcon && (Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : <Clock className="h-4 w-4 text-muted-foreground" />)}
			<span className={timerClassName} aria-live="off" aria-label={displayText}>
				{timerContent}
			</span>
			{!isExpired && activeBadge && <div className="flex-shrink-0">{activeBadge}</div>}
		</div>
	);
}

