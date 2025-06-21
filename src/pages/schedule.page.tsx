import { PageWrapper } from "@/components";
import {
	ScheduleGrid,
	ScheduleGridItem,
	ScheduleRoot,
	ScheduleTabContent,
	ScheduleTabList,
	ScheduleTabTrigger,
	format12HourTime,
} from "@/components/Schedule/Schedule";
import { Box, Text, VStack } from "@chakra-ui/react";
import { useState } from "react";

import { schedule } from "@/data/events";

// utility function to truncate text based on actual card width
function truncateTextByWidth(
	text: string,
	widthPx: number,
	isTitle = true,
): string {
	const avgCharWidth = isTitle ? 6.5 : 6;
	const availableWidth = widthPx - 16;
	const maxChars = Math.floor(availableWidth / avgCharWidth);
	const minChars = 6;
	const finalMaxChars = Math.max(minChars, Math.min(maxChars, 60));

	if (text.length <= finalMaxChars) return text;

	if (finalMaxChars > 10) {
		const truncated = text.slice(0, finalMaxChars - 3);
		const lastSpace = truncated.lastIndexOf(" ");
		if (lastSpace > finalMaxChars * 0.4) {
			return `${truncated.slice(0, lastSpace)}...`;
		}
	}

	return `${text.slice(0, finalMaxChars - 3)}...`;
}

interface ScheduleEntryProps {
	eventId: string;
	title: string;
	location: string;
	description?: string;
	startTime: `${number}:${number}`;
	endTime: `${number}:${number}`;
	color: string;
	row?: number;
	scrollIntoViewOnMount?: boolean;
}

function ScheduleEntry(
	props: ScheduleEntryProps & {
		timeRange: { start: number; end: number };
		timelineWidth: number;
		isExpanded: boolean;
		onExpand: (eventId: string | null) => void;
	},
) {
	const [startHour, startMin] = props.startTime.split(":").map(Number);
	const [endHour, endMin] = props.endTime.split(":").map(Number);
	const startTotalHours = startHour + startMin / 60;
	let endTotalHours = endHour + endMin / 60;
	if (endHour >= 24) {
		endTotalHours = endHour + endMin / 60;
	}
	const durationHours = endTotalHours - startTotalHours;

	const totalHours = props.timeRange.end - props.timeRange.start;
	const duration = durationHours / totalHours;
	const normalWidth = duration * (props.timelineWidth - 32);
	const eventDurationHours = endTotalHours - startTotalHours;
	const minWidth = eventDurationHours <= 0.5 ? 60 : Math.min(80, normalWidth);
	const boxWidth = Math.max(normalWidth, minWidth);

	const isVeryShort = durationHours <= 0.5;
	const isShort = durationHours <= 1;

	return (
		<ScheduleGridItem
			{...props}
			isExpanded={props.isExpanded}
			onExpand={props.onExpand}
		>
			<VStack align="start" h="100%" justify="start" gap={isVeryShort ? 1 : 2}>
				<Text
					fontWeight="bold"
					fontSize={isVeryShort ? "xs" : isShort ? "sm" : "sm"}
					lineHeight={isVeryShort ? "1.1" : "1.2"}
					title={props.title}
					overflow="hidden"
					textOverflow="ellipsis"
					whiteSpace={isVeryShort ? "nowrap" : "normal"}
				>
					{truncateTextByWidth(props.title, boxWidth, true)}
				</Text>
				<Text
					fontSize={isVeryShort ? "xs" : "xs"}
					opacity={0.9}
					lineHeight="1.1"
					title={props.location}
					overflow="hidden"
					textOverflow="ellipsis"
					whiteSpace="nowrap"
				>
					{truncateTextByWidth(props.location, boxWidth, false)}
				</Text>
				<Text fontSize="xs" opacity={0.8} lineHeight="1.1" mt={1}>
					{isVeryShort
						? format12HourTime(props.startTime, false)
						: `${format12HourTime(props.startTime, false)} - ${format12HourTime(props.endTime, false)}`}
				</Text>
			</VStack>
		</ScheduleGridItem>
	);
}

function calculateTimeRange(
	events: typeof schedule,
	dayDate: Date,
): {
	start: number;
	end: number;
} {
	if (events.length === 0) return { start: 9, end: 17 }; // default: 9 AM to 5 PM

	let earliestStart = 24;
	let latestEnd = 0;

	events.forEach((event) => {
		// Ignore events that were added to this day as a late-night duplicate
		if (event.startDate.toDateString() !== dayDate.toDateString()) return;

		const startHour =
			event.startDate.getHours() + event.startDate.getMinutes() / 60;
		let endHour = event.endTime.getHours() + event.endTime.getMinutes() / 60;

		if (event.endTime.getDate() > event.startDate.getDate()) {
			endHour += 24;
		}

		earliestStart = Math.min(earliestStart, startHour);
		latestEnd = Math.max(latestEnd, endHour);
	});

	const start = Math.max(0, Math.floor(earliestStart) - 1);
	const end = Math.min(48, Math.ceil(latestEnd) + 1); // allow up to 48 hours (next day)

	return { start, end };
}

export const SchedulePage: React.FC = () => {
	const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

	const groupedSchedule = schedule.reduce((acc, event) => {
		let endHour = event.endTime.getHours();
		if (event.endTime.getDate() > event.startDate.getDate()) {
			endHour += 24;
		}

		const hour = event.startDate.getHours();
		const minute = event.startDate.getMinutes();

		const actualDate = new Date(event.startDate);
		const actualKey = actualDate.toLocaleDateString("en-US", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});

		const addToGroup = (key: string, date: Date, entry: ScheduleEntryProps) => {
			const dayMapEntry = acc.get(key) ?? {
				dayDate: date,
				entries: [] as ScheduleEntryProps[],
				events: [] as typeof schedule,
			};
			acc.set(key, dayMapEntry);
			dayMapEntry.entries.push(entry);
			dayMapEntry.events.push(event);
		};

		// original entry (for the correct day)
		const normalEntry: ScheduleEntryProps = {
			eventId: event.id,
			title: event.title,
			location: event.location,
			description: event.description,
			startTime: `${hour}:${minute}` as const,
			endTime: `${endHour}:${event.endTime.getMinutes()}` as const,
			color: event.color,
			row: event.row,
		};
		addToGroup(actualKey, actualDate, normalEntry);

		// if the event starts < 2AM, also add to previous day with adjusted start time
		if (hour < 2) {
			const prevDate = new Date(event.startDate);
			prevDate.setDate(prevDate.getDate() - 1);

			const prevKey = prevDate.toLocaleDateString("en-US", {
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			});

			const duplicateEntry: ScheduleEntryProps = {
				...normalEntry,
				startTime: `${hour + 24}:${minute}` as const,
				endTime: `${endHour + 24}:${event.endTime.getMinutes()}` as const,
			};

			addToGroup(prevKey, prevDate, duplicateEntry);
		}

		return acc;
	}, new Map<
		string,
		{ dayDate: Date; entries: ScheduleEntryProps[]; events: typeof schedule }
	>());

	const scheduleEntries = Array.from(groupedSchedule.entries()).map(
		([dayKey, data]) => {
			const timeRange = calculateTimeRange(data.events, data.dayDate);
			const totalHours = timeRange.end - timeRange.start;
			const timelineWidth = Math.max(800, totalHours * 150);
			return [dayKey, { ...data, timeRange, timelineWidth }] as const;
		},
	);

	return (
		<Box bg="bg" minH="100vh" color="white">
			<PageWrapper>
				<VStack align="stretch">
					<Box flex="1" minH="650px">
						<ScheduleRoot defaultValue={scheduleEntries[0]?.[0]}>
							<ScheduleTabList>
								{scheduleEntries.map(([dayKey, { dayDate }]) => (
									<ScheduleTabTrigger key={dayKey} value={dayKey}>
										{dayDate.toLocaleDateString("en-US", {
											weekday: "long",
										})}
									</ScheduleTabTrigger>
								))}
							</ScheduleTabList>

							{scheduleEntries.map(
								([dayKey, { dayDate, entries, timeRange, timelineWidth }]) => (
									<ScheduleTabContent key={dayKey} value={dayKey}>
										<ScheduleGrid
											dayDate={dayDate}
											timeRange={timeRange}
											expandedEvent={expandedEvent}
											onEventExpand={setExpandedEvent}
										>
											{entries.map((entry) => (
												<ScheduleEntry
													key={entry.eventId}
													scrollIntoViewOnMount={false}
													eventId={entry.eventId}
													startTime={entry.startTime}
													endTime={entry.endTime}
													color={entry.color}
													title={entry.title}
													location={entry.location}
													description={entry.description}
													row={entry.row}
													timeRange={timeRange}
													timelineWidth={timelineWidth}
													isExpanded={expandedEvent === entry.eventId}
													onExpand={setExpandedEvent}
												/>
											))}
										</ScheduleGrid>
									</ScheduleTabContent>
								),
							)}
						</ScheduleRoot>
					</Box>
				</VStack>
			</PageWrapper>
		</Box>
	);
};
