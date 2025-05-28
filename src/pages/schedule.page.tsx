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
import { schedule } from '@/data/events';
import { useState } from "react";

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
			<VStack align="start" h="100%">
				<Text fontWeight="bold" fontSize="sm">
					{props.title}
				</Text>
				<Text fontSize="xs" opacity={0.8}>
					{props.location}
				</Text>
				<Text fontSize="xs" opacity={0.7} mt="auto">
					{format12HourTime(props.startTime)} -{" "}
					{format12HourTime(props.endTime)}
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
		const endHour = event.endTime.getHours() + event.endTime.getMinutes() / 60;

		earliestStart = Math.min(earliestStart, startHour);
		latestEnd = Math.max(latestEnd, endHour);
	});

	const start = Math.max(0, Math.floor(earliestStart) - 1);
	const end = Math.min(24, Math.ceil(latestEnd) + 1);

	return { start, end };
}

export const SchedulePage: React.FC = () => {
	const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

	const groupedSchedule = schedule.reduce((acc, event) => {
		const entry: ScheduleEntryProps = {
			eventId: event.id,
			title: event.title,
			location: event.location,
			description: event.description,
			startTime:
				`${event.startDate.getHours()}:${event.startDate.getMinutes()}` as const,
			endTime:
				`${event.endTime.getHours()}:${event.endTime.getMinutes()}` as const,
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
		<Box bg="gray.900" minH="100vh" color="white">
			<PageWrapper>
				<VStack align="stretch" h="100%">
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
										{entries.map((entry, idx) => (
											<ScheduleEntry
												key={entry.eventId}
												scrollIntoViewOnMount={idx === 0}
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
				</VStack>
			</PageWrapper>
		</Box>
	);
};
