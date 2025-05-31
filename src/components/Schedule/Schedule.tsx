import { Box, Button, HStack, Tabs, Text, VStack } from "@chakra-ui/react";
import { useEffect, useRef, useState } from "react";

const DESKTOP_TIME_INDICATOR_HEIGHT = "40px";

interface ScheduleRootProps {
	defaultValue?: string;
	children: React.ReactNode;
}

export function ScheduleRoot(props: ScheduleRootProps) {
	return (
		<Tabs.Root
			display="flex"
			flexDirection="column"
			flex="1"
			minH="0"
			lazyMount
			bg="bg"
			{...props}
		/>
	);
}

export function ScheduleTabList(props: React.PropsWithChildren) {
	return (
		<Tabs.List
			display="flex"
			bg="transparent"
			borderBottom="1px solid"
			borderColor="gray.700"
			px={4}
			{...props}
		/>
	);
}

interface ScheduleTabTriggerProps {
	value: string;
	children: React.ReactNode;
}

export function ScheduleTabTrigger(props: ScheduleTabTriggerProps) {
	return (
		<Tabs.Trigger
			flex="1"
			display="flex"
			justifyContent="center"
			color="offwhite.primary"
			fontWeight="medium"
			fontSize="sm"
			textTransform="uppercase"
			letterSpacing="wider"
			py={4}
			_selected={{
				color: "white",
				borderBottom: "2px solid",
				borderColor: "blue.400",
			}}
			_hover={{
				color: "gray.200",
			}}
			{...props}
		/>
	);
}

interface ScheduleContentProps {
	value: string;
	children: React.ReactNode;
}

export function ScheduleTabContent(props: ScheduleContentProps) {
	return (
		<Tabs.Content
			display="flex"
			flexDirection="column"
			flex="1"
			minH="0"
			bg="bg"
			{...props}
		/>
	);
}

interface ScheduleGridProps {
	children: React.ReactNode;
	dayDate: Date;
	timeRange: { start: number; end: number }; // 24-hr format
	expandedEvent: string | null;
	onEventExpand: (eventId: string | null) => void;
}

export function ScheduleGrid(props: ScheduleGridProps) {
	const { timeRange } = props;
	const totalHours = timeRange.end - timeRange.start;
	const timelineWidth = Math.max(800, totalHours * 120);

	const timeSlots = [];

	for (let hour = timeRange.start; hour < timeRange.end; hour++) {
		const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
		const period = hour < 12 ? "AM" : "PM";

		timeSlots.push({
			hour,
			display: hour === 0 ? "12:00 AM" : `${displayHour}:00 ${period}`,
		});
	}

	// row spacing: 110px, event height: 100px, starting position: 20px
	// row 4 (bottom) = 20px + (3 * 110px) + 100px = 450px
	// additional padding = 500px total content height
	const contentHeight = 500;
	const totalGridHeight = contentHeight + 60;

	return (
		<Box
			w="100%"
			flex="1"
			bg="bg"
			position="relative"
			h={`${totalGridHeight}px`}
		>
			<Box position="relative" w="100%" h="100%">
				<Box
					position="absolute"
					left="0"
					top="0"
					w="60px"
					h="100%"
					bgGradient="linear(to-r, gray.900, transparent)"
					zIndex={30}
					pointerEvents="none"
				/>

				<Box
					position="absolute"
					right="0"
					top="0"
					w="60px"
					h="100%"
					bgGradient="linear(to-l, gray.900, transparent)"
					zIndex={30}
					pointerEvents="none"
				/>

				<Box
					overflowX="auto"
					overflowY="hidden"
					h="100%"
					css={{
						"&::-webkit-scrollbar": {
							height: "8px",
							width: "8px",
						},
						"&::-webkit-scrollbar-track": {
							background: "rgba(0,0,0,0.1)",
						},
						"&::-webkit-scrollbar-thumb": {
							background: "rgba(255,255,255,0.2)",
							borderRadius: "4px",
						},
						"&::-webkit-scrollbar-thumb:hover": {
							background: "rgba(255,255,255,0.3)",
						},
					}}
				>
					<Box
						position="sticky"
						top="0"
						zIndex={40}
						bg="bg"
						borderBottom="1px solid"
						borderColor="gray.700"
						boxShadow="0 2px 8px rgba(0,0,0,0.3)"
					>
						<Box
							position="relative"
							minW={`${timelineWidth}px`}
							h={DESKTOP_TIME_INDICATOR_HEIGHT}
							px={4}
						>
							{timeSlots.map((slot, i) => {
								const offset = 16 + (i / totalHours) * (timelineWidth - 32);

								return (
									<Box
										key={slot.hour}
										position="absolute"
										left={`${offset}px`}
										top="50%"
										transform="translateY(-50%)"
										whiteSpace="nowrap"
									>
										<Text fontSize="xs" color="gray.400" fontWeight="medium">
											{slot.display}
										</Text>
									</Box>
								);
							})}
						</Box>
					</Box>

					<Box position="relative" h={`${contentHeight}px`}>
						<Box
							minW={`${timelineWidth}px`}
							position="relative"
							px={4}
							pt={4}
							pb={4}
							h="100%"
						>
							{timeSlots.map((_, i) => (
								<Box
									key={`vertical-${i}`}
									position="absolute"
									left={`${16 + (i / totalHours) * (timelineWidth - 32)}px`}
									top="0"
									w="1px"
									bg="gray.800"
									opacity={0.3}
									h="100%"
									zIndex={1}
								/>
							))}

							<Box
								position="absolute"
								left={`${timelineWidth - 16}px`}
								top="0"
								w="1px"
								bg="gray.800"
								opacity={0.3}
								h="100%"
								zIndex={1}
							/>

							{Array.from({ length: 6 }, (_, i) => (
								<Box
									key={`horizontal-${i}`}
									position="absolute"
									left="0"
									top={`${i * 110 + 16}px`}
									h="1px"
									bg="gray.800"
									opacity={0.2}
									w="100%"
									zIndex={1}
								/>
							))}

							<ScheduleCurrentTimeLine
								dayDate={props.dayDate}
								timeRange={timeRange}
								timelineWidth={timelineWidth}
							/>

							<Box position="relative" zIndex={10}>
								{props.children}
							</Box>
						</Box>
					</Box>
				</Box>
			</Box>
		</Box>
	);
}

function ScheduleCurrentTimeLine({
	dayDate,
	timeRange,
	timelineWidth,
}: {
	dayDate: Date;
	timeRange: { start: number; end: number };
	timelineWidth: number;
}) {
	const [shouldShow, setShouldShow] = useState(false);
	const [progressPercentage, setProgressPercentage] = useState(0);

	const TICK_INTERVAL = 10000;

	useEffect(() => {
		const dayStart = new Date(dayDate);
		dayStart.setHours(timeRange.start, 0, 0, 0);

		const dayEnd = new Date(dayDate);
		dayEnd.setHours(timeRange.end, 0, 0, 0);

		function tick() {
			const now = new Date();
			const nextShouldShow = now >= dayStart && now < dayEnd;

			setShouldShow(nextShouldShow);

			if (!nextShouldShow) {
				return;
			}

			const totalDuration = dayEnd.getTime() - dayStart.getTime();
			const currentDuration = now.getTime() - dayStart.getTime();

			setProgressPercentage((currentDuration / totalDuration) * 100);
		}

		tick();
		const interval = setInterval(tick, TICK_INTERVAL);
		return () => clearInterval(interval);
	}, [dayDate, timeRange]);

	if (!shouldShow) {
		return null;
	}

	return (
		<>
			<Box
				position="absolute"
				left={`${16 + (progressPercentage / 100) * (timelineWidth - 32)}px`}
				top="-40px"
				w="2px"
				bg="white"
				zIndex={50}
				h="calc(100% + 40px)"
				opacity={0.9}
				boxShadow="0 0 4px rgba(255,255,255,0.5)"
			/>

			<Box
				position="absolute"
				left={`${14 + (progressPercentage / 100) * (timelineWidth - 32)}px`}
				top="-42px"
				w="6px"
				h="6px"
				bg="white"
				borderRadius="50%"
				zIndex={51}
				boxShadow="0 0 8px rgba(255,255,255,0.8)"
			/>
		</>
	);
}

export interface ScheduleGridItemProps {
	scrollIntoViewOnMount?: boolean;
	startTime: TimeType;
	endTime: TimeType;
	color: string;
	onClick?: () => void;
	children: React.ReactNode;
	row?: number;
	timeRange: { start: number; end: number };
	timelineWidth: number;
	eventId: string;
	title: string;
	location: string;
	description?: string;
	isExpanded?: boolean;
	onExpand?: (eventId: string | null) => void;
}

export function ScheduleGridItem({
	scrollIntoViewOnMount = false,
	startTime,
	endTime,
	color = "blue",
	onClick,
	children,
	row = 1,
	timeRange,
	timelineWidth,
	eventId,
	title,
	location,
	description = "",
	isExpanded = false,
	onExpand,
}: ScheduleGridItemProps) {
	const itemRef = useRef<HTMLDivElement>(null);

	const startHour = scheduleColumnHelper(startTime);
	const endHour = scheduleColumnHelper(endTime);
	const totalHours = timeRange.end - timeRange.start;

	const colorMap: Record<
		string,
		{ bg: string; border: string; hover: string }
	> = {
		finished: { bg: "#333147", border: "#333147", hover: "#666484" },
		teal: { bg: "#496BC4", border: "#496BC4", hover: "#6180CF" },
		green: { bg: "#496BC4", border: "#496BC4", hover: "#6180CF" },
		purple: { bg: "#8C78C2", border: "#8C78C2", hover: "#A090CC" },
		red: { bg: "#AC7F94", border: "#AC7F94", hover: "#B991A3" },
		blue: { bg: "#496BC4", border: "#496BC4", hover: "#6180CF" },
		orange: { bg: "#BA814F", border: "#BA814F", hover: "#D09C6D" },
	};

	const colors = colorMap[color] || colorMap.blue;

	useEffect(() => {
		if (scrollIntoViewOnMount && itemRef.current) {
			itemRef.current.scrollIntoView({
				behavior: "smooth",
				inline: "start",
				block: "nearest",
			});
		}
	}, [scrollIntoViewOnMount]);

	const startOffset = (startHour - timeRange.start) / totalHours;
	const duration = (endHour - startHour) / totalHours;

	const leftPosition = 16 + startOffset * (timelineWidth - 32);
	const normalWidth = duration * (timelineWidth - 32);

	const minWidth = 140;
	const maxWidth = (3 / totalHours) * (timelineWidth - 32);

	const displayWidth = isExpanded
		? Math.min(Math.max(normalWidth, minWidth, 320), maxWidth)
		: Math.max(normalWidth, minWidth);

	let adjustedLeftPosition: number;

	if (isExpanded) {
		const rightPosition = leftPosition + normalWidth;
		const idealLeftPosition = rightPosition - displayWidth;

		const leftBoundary = 16;
		const rightBoundary = timelineWidth - 16;

		if (idealLeftPosition < leftBoundary) {
			adjustedLeftPosition = leftBoundary;
		} else if (idealLeftPosition + displayWidth > rightBoundary) {
			adjustedLeftPosition = rightBoundary - displayWidth;
		} else {
			adjustedLeftPosition = idealLeftPosition;
		}

		adjustedLeftPosition = Math.max(
			leftBoundary,
			Math.min(adjustedLeftPosition, rightBoundary - displayWidth),
		);
	} else {
		adjustedLeftPosition = leftPosition;
	}

	const baseHeight = 100;
	const expandedBaseHeight = 160;

	const titleLines = Math.ceil(title.length / 35);
	const descriptionLines = description ? Math.ceil(description.length / 45) : 0;
	const contentHeight = (titleLines + descriptionLines + 3) * 16;

	const displayHeight = isExpanded
		? Math.max(expandedBaseHeight, contentHeight + 60)
		: baseHeight;

	const containerHeight = 500;
	const baseTop = (row - 1) * 110 + 16;

	let adjustedTop: number;

	if (isExpanded) {
		const topBoundary = 20;
		const bottomBoundary = containerHeight - 20;

		if (baseTop + displayHeight > bottomBoundary) {
			adjustedTop = Math.max(topBoundary, bottomBoundary - displayHeight);
		} else if (baseTop < topBoundary) {
			adjustedTop = topBoundary;
		} else {
			adjustedTop = baseTop;
		}
	} else {
		adjustedTop = baseTop;
	}

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();

		console.log(
			`Clicked event: ${title}, eventId: ${eventId}, isExpanded: ${isExpanded}`,
		);

		if (onExpand) {
			onExpand(isExpanded ? null : eventId);
		}

		if (onClick) {
			onClick();
		}
	};

	return (
		<Box
			ref={itemRef}
			position="absolute"
			left={`${adjustedLeftPosition}px`}
			width={`${displayWidth}px`}
			top={`${adjustedTop}px`}
			height={`${displayHeight}px`}
			bg={isExpanded ? "offwhite.primary" : colors.bg}
			borderRadius="lg"
			p={isExpanded ? 3 : 2}
			cursor="pointer"
			onClick={handleClick}
			color={isExpanded ? "black" : "white"}
			boxShadow={isExpanded ? "2xl" : "lg"}
			border="2px solid"
			borderColor={isExpanded ? colors.border : colors.border}
			transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
			transformOrigin="bottom right"
			transform={isExpanded ? "scale(1)" : "scale(1)"}
			zIndex={isExpanded ? 35 : 15}
			overflow="hidden"
			_hover={{
				transform: isExpanded ? "scale(1)" : "translateY(-2px) scale(1.02)",
				boxShadow: isExpanded ? "2xl" : "xl",
				bg: isExpanded ? "offwhite.primary" : colors.hover,
			}}
		>
			{isExpanded ? (
				<VStack align="start" h="100%">
					<VStack align="start" flexShrink={0}>
						<Text fontWeight="bold" fontSize="sm" lineHeight="1.3">
							{title}
						</Text>
						<Text
							fontSize="xs"
							color={isExpanded ? "gray.600" : "gray.200"}
							lineHeight="1.2"
						>
							{location}
						</Text>
						<Text
							fontSize="xs"
							color={isExpanded ? "gray.500" : "gray.300"}
							lineHeight="1.2"
						>
							{format12HourTime(startTime)} - {format12HourTime(endTime)}
						</Text>
					</VStack>

					{description && (
						<Box
							flex="1"
							overflow="auto"
							w="100%"
							css={{
								"&::-webkit-scrollbar": {
									width: "4px",
								},
								"&::-webkit-scrollbar-track": {
									background: "rgba(0,0,0,0.1)",
								},
								"&::-webkit-scrollbar-thumb": {
									background: isExpanded
										? "rgba(0,0,0,0.3)"
										: "rgba(255,255,255,0.3)",
									borderRadius: "2px",
								},
								"&::-webkit-scrollbar-thumb:hover": {
									background: isExpanded
										? "rgba(0,0,0,0.5)"
										: "rgba(255,255,255,0.3)",
								},
							}}
						>
							<Text fontSize="xs" lineHeight="1.4">
								{description}
							</Text>
						</Box>
					)}

					<HStack flexShrink={0} justify="flex-end" w="100%">
						<Button
							size="xs"
							bg="orange.500"
							color="white"
							borderRadius="full"
							px={4}
							fontSize="xs"
							h="24px"
							_hover={{ bg: "orange.600" }}
							boxShadow={isExpanded ? "sm" : "none"}
							onClick={(e) => {
								e.stopPropagation();
								console.log("RSVP clicked for", title);
							}}
						>
							RSVP
						</Button>
					</HStack>
				</VStack>
			) : (
				children
			)}
		</Box>
	);
}

type TimeType = `${number}:${number}`;

function scheduleColumnHelper(time: TimeType): number {
	const [hour, minute] = time.split(":").map(Number);

	return hour + minute / 60;
}

export function format12HourTime(time: TimeType): string {
	const [hour, minute] = time.split(":").map(Number);
	const period = hour >= 12 ? "PM" : "AM";
	const formattedHour = hour % 12 || 12;
	const formattedMinute = minute.toString().padStart(2, "0");

	return `${formattedHour}:${formattedMinute} ${period}`;
}
