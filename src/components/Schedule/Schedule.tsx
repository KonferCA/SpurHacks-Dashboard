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
	const { timeRange, expandedEvent, onEventExpand } = props;
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
	// additional padding = 480px total content height
	const contentHeight = 480;
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

							{Array.from({ length: 5 }, (_, i) => (
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

							{expandedEvent && (
								<Box
									position="absolute"
									top="0"
									left="0"
									right="0"
									bottom="0"
									bg="blackAlpha.600"
									zIndex={25}
									onClick={() => onEventExpand(null)}
								/>
							)}

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

	const colorMap: Record<string, { bg: string; border: string }> = {
		teal: { bg: "teal.600", border: "teal.500" },
		green: { bg: "green.600", border: "green.500" },
		purple: { bg: "purple.600", border: "purple.500" },
		red: { bg: "red.600", border: "red.500" },
		blue: { bg: "blue.600", border: "blue.500" },
		orange: { bg: "orange.600", border: "orange.500" },
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

	const minWidth = 180;
	const maxWidth = 250;

	const displayWidth = isExpanded
		? Math.min(maxWidth * 1.5, Math.max(normalWidth, minWidth * 1.2))
		: Math.min(maxWidth, Math.max(normalWidth, minWidth));

	const displayHeight = isExpanded ? 160 : 100;

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
			left={`${leftPosition}px`}
			width={`${displayWidth}px`}
			top={`${(row - 1) * 110 + 16}px`}
			height={`${displayHeight}px`}
			bg={colors.bg}
			borderRadius="lg"
			p={isExpanded ? 3 : 2}
			cursor="pointer"
			onClick={handleClick}
			color="white"
			boxShadow={isExpanded ? "2xl" : "lg"}
			border="2px solid"
			borderColor={colors.border}
			transition="all 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
			transformOrigin="bottom left"
			transform={isExpanded ? "scale(1.02)" : "scale(1)"}
			zIndex={isExpanded ? 35 : 15}
			overflow="hidden"
			_hover={{
				transform: isExpanded ? "scale(1.02)" : "translateY(-2px) scale(1.02)",
				boxShadow: isExpanded ? "2xl" : "xl",
			}}
		>
			{isExpanded ? (
				<VStack align="start" h="100%">
					<VStack align="start" flexShrink={0}>
						<Text fontWeight="bold" fontSize="sm">
							{title}
						</Text>
						<Text fontSize="xs" color="gray.200">
							{location}
						</Text>
						<Text fontSize="xs" color="gray.300">
							{format12HourTime(startTime)} - {format12HourTime(endTime)}
						</Text>
					</VStack>

					{description && (
						<Box
							flex="1"
							overflow="auto"
							w="100%"
							mt={1}
							css={{
								"&::-webkit-scrollbar": {
									width: "4px",
								},
								"&::-webkit-scrollbar-track": {
									background: "rgba(0,0,0,0.1)",
								},
								"&::-webkit-scrollbar-thumb": {
									background: "rgba(255,255,255,0.3)",
									borderRadius: "2px",
								},
							}}
						>
							<Text fontSize="xs">{description}</Text>
						</Box>
					)}

					<HStack flexShrink={0} mt={1}>
						<Button
							size="xs"
							bg="orange.500"
							color="white"
							borderRadius="full"
							px={4}
							fontSize="xs"
							h="24px"
							_hover={{ bg: "orange.600" }}
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
