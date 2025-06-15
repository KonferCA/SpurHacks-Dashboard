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

// utility function to truncate text based on card width (time duration)
function truncateTextByDuration(text: string, startTime: string, endTime: string): string {
	const [startHour, startMin] = startTime.split(':').map(Number);
	const [endHour, endMin] = endTime.split(':').map(Number);
	
	const startTotalHours = startHour + startMin / 60;
	let endTotalHours = endHour + endMin / 60;
	
	if (endHour >= 24) {
		endTotalHours = endHour + endMin / 60; 
	}
	
	const durationHours = endTotalHours - startTotalHours;
	
	const baseChars = 21;
	const scaleFactor = 12;
	const maxChars = Math.min(60, Math.max(baseChars, Math.floor(baseChars + (durationHours - 0.5) * scaleFactor)));
	
	if (text.length <= maxChars) return text;
	return `${text.slice(0, maxChars - 3)}...`;
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
	return (
		<ScheduleGridItem
			{...props}
			isExpanded={props.isExpanded}
			onExpand={props.onExpand}
		>
			<VStack align="start" h="100%" justify="start">
				<Text 
					fontWeight="bold" 
					fontSize="sm" 
					lineHeight="1.2"
					title={props.title} 
				>
					{truncateTextByDuration(props.title, props.startTime, props.endTime)}
				</Text>
				<Text 
					fontSize="xs" 
					opacity={0.9} 
					lineHeight="1.1"
					title={props.location}
				>
					{truncateTextByDuration(props.location, props.startTime, props.endTime)}
				</Text>
				<Text fontSize="xs" opacity={0.8} lineHeight="1.1" mt={1}>
					{format12HourTime(props.startTime, false)} -{" "}
					{format12HourTime(props.endTime, false)}
				</Text>
			</VStack>
		</ScheduleGridItem>
	);
}

function calculateTimeRange(events: typeof schedule): {
	start: number;
	end: number;
} {
	if (events.length === 0) return { start: 9, end: 17 }; // default: 9 AM to 5 PM

	let earliestStart = 24;
	let latestEnd = 0;

	events.forEach((event) => {
		const startHour =
			event.startDate.getHours() + event.startDate.getMinutes() / 60;
		let endHour = event.endTime.getHours() + event.endTime.getMinutes() / 60;

		// handle cross-day events (e.g., 11 PM to 1 AM next day)
		// if end time is on the next day, add 24 hours to represent it on the same timeline
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

		const entry: ScheduleEntryProps = {
			eventId: event.id,
			title: event.title,
			location: event.location,
			description: event.description,
			startTime:
				`${event.startDate.getHours()}:${event.startDate.getMinutes()}` as const,
			endTime:
				`${endHour}:${event.endTime.getMinutes()}` as const,
			color: event.color,
			row: event.row,
		};

		const dayKey = event.startDate.toLocaleDateString("en-US", {
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
		});

		const dayMapEntry = acc.get(dayKey) ?? {
			dayDate: event.startDate,
			entries: [] as ScheduleEntryProps[],
			events: [] as typeof schedule,
		};

		acc.set(dayKey, dayMapEntry);
		dayMapEntry.entries.push(entry);
		dayMapEntry.events.push(event);

		return acc;
	}, new Map<
		string,
		{ dayDate: Date; entries: ScheduleEntryProps[]; events: typeof schedule }
	>());

	const scheduleEntries = Array.from(groupedSchedule.entries()).map(
		([dayKey, data]) => {
			const timeRange = calculateTimeRange(data.events);
			const totalHours = timeRange.end - timeRange.start;
			const timelineWidth = Math.max(800, totalHours * 120);

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
