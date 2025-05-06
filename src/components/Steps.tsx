import {
	Box,
	Flex,
	GridItem,
	Icon,
	SimpleGrid,
	Text,
	useBreakpointValue,
} from "@chakra-ui/react";
import { Check } from "@phosphor-icons/react";
import { ReactNode, useMemo } from "react";

type StepStatus = "inactive" | "active" | "completed";

interface StepProps {
	step: number;
	title: string;
	status: StepStatus;
}

function StepIcon({ step, status }: { step: number; status: StepStatus }) {
	return (
		<Flex
			borderRadius="full"
			alignItems="center"
			justifyContent="center"
			width="2rem"
			height="2rem"
			aspectRatio="1/1"
			background={status === "completed" ? "brand.primary" : "transparent"}
			ring="2px"
			ringColor={
				status === "completed"
					? "transparent"
					: status === "active"
						? "offwhite.primary"
						: "#666484"
			}
		>
			{status === "completed" && (
				<Icon size="md" color="black">
					<Check />
				</Icon>
			)}
			{status !== "completed" && (
				<Text
					color={status === "active" ? "offwhite.primary" : "#666484"}
					fontSize="sm"
				>
					{step + 1}
				</Text>
			)}
		</Flex>
	);
}

function Step(props: StepProps) {
	const isBipolarBigBoi = useBreakpointValue({ bipolarBigBoi: true });
	const isBiPolarNotSoBigBoi = useBreakpointValue({ bipolarNotSoBigBoi: true });
	const isSmall = useBreakpointValue({ sm: true });

	return (
		<Box>
			<Box marginBottom="1rem">
				<Flex justifyContent="start" gap="1rem" alignItems="center">
					{isSmall && (isBipolarBigBoi || !isBiPolarNotSoBigBoi) && (
						<StepIcon step={props.step} status={props.status} />
					)}
					{isSmall &&
						(isBipolarBigBoi || (!isBipolarBigBoi && isBiPolarNotSoBigBoi)) && (
							<Text
								textTransform="uppercase"
								textWrap="nowrap"
								color={
									props.status === "completed"
										? "brand.primary"
										: props.status === "active"
											? "offwhite.primary"
											: "#666484"
								}
							>
								{props.title}
							</Text>
						)}
				</Flex>
			</Box>
			<Box
				width="ful"
				rounded="full"
				height="4px"
				background={
					props.status === "completed"
						? "brand.primary"
						: props.status === "active"
							? "offwhite.primary"
							: "#666484"
				}
			></Box>
		</Box>
	);
}

export interface StepsProps {
	step: number;
	count: number;
	onGetStepTitle: (step: number) => string;
}

export function Steps({ step, count, onGetStepTitle }: StepsProps) {
	// completed steps are all steps smaller than current step
	const completedSteps = useMemo(() => {
		const steps: ReactNode[] = [];
		for (let i = 0; i < step; i++) {
			steps.push(
				<GridItem>
					<Step step={i} title={onGetStepTitle(i)} status="completed" />
				</GridItem>,
			);
		}
		return steps;
	}, [step, onGetStepTitle]);

	const activeStep = useMemo(() => {
		return (
			<GridItem>
				<Step step={step} title={onGetStepTitle(step)} status="active" />
			</GridItem>
		);
	}, [step, onGetStepTitle]);

	const inactiveSteps = useMemo(() => {
		const steps: ReactNode[] = [];
		for (let i = step + 1; i < count; i++) {
			steps.push(
				<GridItem>
					<Step step={i} title={onGetStepTitle(i)} status="inactive" />
				</GridItem>,
			);
		}
		return steps;
	}, [step, count, onGetStepTitle]);

	return (
		<SimpleGrid columns={5} gap={{ base: "0.25rem", sm: "1rem" }}>
			{completedSteps}
			{activeStep}
			{inactiveSteps}
		</SimpleGrid>
	);
}
