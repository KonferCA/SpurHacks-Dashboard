import { LoadingAnimation, PageWrapper, Select, TextInput } from "@/components";
import { toaster } from "@/components/ui/toaster";
import { useAuth } from "@/providers";
import { getRedeemableItems, redeemItem } from "@/services/firebase/redeem";
import { getExtendedTicketData } from "@/services/firebase/ticket";
import type { EventItem, ExtendedTicketData } from "@/services/firebase/types";
import { firestore } from "@/services/firebase";
import {
	collection,
	query as firestoreQuery,
	where,
	getDocs,
	limit,
} from "firebase/firestore";
import {
	Badge,
	Box,
	Button,
	Card,
	CardBody,
	CardHeader,
	Flex,
	Heading,
	Icon,
	Text,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FaCheck, FaQrcode, FaUtensils, FaUndo } from "react-icons/fa";
import { MdRefresh } from "react-icons/md";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { useParams, useNavigate } from "react-router-dom";
import { useRef } from "react";

export const AdminScanPage = () => {
	const { currentUser } = useAuth();
	const { ticketId: urlTicketId } = useParams();
	const navigate = useNavigate();
	const scannerRef = useRef<HTMLDivElement>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [ticketData, setTicketData] = useState<ExtendedTicketData | null>(null);
	const [events, setEvents] = useState<EventItem[]>([]);
	const [scannedTicketId, setScannedTicketId] = useState<string | null>(null);
	const [isScanning, setIsScanning] = useState(true);
	const [rapidScanMode, setRapidScanMode] = useState(false);
	const [selectedRapidItem, setSelectedRapidItem] = useState<{
		id: string;
		title: string;
		type: "food" | "event";
	} | null>(null);
	const [lastScannedPerson, setLastScannedPerson] = useState<string>("");
	const [lastScannedTicketId, setLastScannedTicketId] = useState<string>("");
	const [lastAction, setLastAction] = useState<"check" | "uncheck" | null>(
		null,
	);
	const [recentScans, setRecentScans] = useState<Set<string>>(new Set());
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [searchResults, setSearchResults] = useState<
		Array<{
			ticketId: string;
			name: string;
			email: string;
		}>
	>([]);
	const [isSearching, setIsSearching] = useState(false);
	const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);

	// check if we're in direct ticket view mode
	const isDirectTicketView = !!urlTicketId;

	// fetch events data on component mount
	useEffect(() => {
		const fetchEvents = async () => {
			try {
				const eventsData = await getRedeemableItems();
				console.log("Loaded events:", eventsData);
				setEvents(eventsData);

				if (eventsData.length === 0) {
					toaster.error({
						title: "No events loaded",
						description: "idk.",
						duration: 8000,
					});
				}
			} catch (error) {
				console.error("Failed to fetch events:", error);
				toaster.error({
					title: "Failed to load events",
					description: "idk.",
					duration: 8000,
				});
			}
		};
		fetchEvents();
	}, []);



	// rapid scan for a specific item
	const handleRapidScan = async (
		ticketId: string,
		rapidItem: { id: string; title: string; type: "food" | "event" },
	) => {
		// prevent duplicate scans within 2 seconds
		const scanKey = `${ticketId}-${rapidItem.id}`;
		if (recentScans.has(scanKey)) {
			return; // ignore duplicate scan
		}

		// add to recent scans and remove after 2 seconds
		setRecentScans((prev) => new Set(prev).add(scanKey));
		setTimeout(() => {
			setRecentScans((prev) => {
				const newSet = new Set(prev);
				newSet.delete(scanKey);
				return newSet;
			});
		}, 2000);

		try {
			// first get minimal ticket data to check current status
			const ticketResponse = await getExtendedTicketData(ticketId);
			if (ticketResponse.status !== 200) {
				toaster.error({
					title: "Failed to load ticket",
					description: ticketResponse.message,
				});
				return;
			}

			const isCurrentlyChecked = ticketResponse.data.events.includes(
				rapidItem.id,
			);
			const personName = `${ticketResponse.data.firstName} ${ticketResponse.data.lastName}`;

			// rapid scan only sets/adds items, never removes
			if (isCurrentlyChecked) {
				const itemTypeText = rapidItem.type === "food" ? "fed" : "checked in";
				toaster.error({
					title: `Already ${itemTypeText}`,
					description: `${personName} has already been ${itemTypeText} for ${rapidItem.title}`,
					duration: 4000,
				});
				return;
			}

			// only check/add the item
			const response = await redeemItem(ticketId, rapidItem.id, "check");

			if (response.status === 200) {
				setLastScannedPerson(personName);
				setLastScannedTicketId(ticketId);
				setLastAction("check");

				const statusText = rapidItem.type === "food" ? "Fed" : "Checked in";

				// show success toast
				toaster.success({
					title: `${statusText}: ${personName}`,
					description: rapidItem.title,
				});

				// show separate warning toast for allergies if this is a food event
				if (
					rapidItem.type === "food" &&
					ticketResponse.data.allergies &&
					Array.isArray(ticketResponse.data.allergies) &&
					ticketResponse.data.allergies.length > 0
				) {
					toaster.warning({
						title: "! ALLERGIES WARNING",
						description: `${personName}: ${ticketResponse.data.allergies.join(", ")}`,
						duration: 8000,
					});
				}
			} else {
				toaster.error({
					title: "Failed to update status",
					description: response.message,
				});
			}
		} catch (error) {
			console.error("Error in rapid scan:", error);
			toaster.error({
				title: "Error updating status",
				description: (error as Error).message,
			});
		}
	};

	// load ticket data
	const loadTicketData = async (ticketId: string) => {
		setIsLoading(true);
		try {
			const response = await getExtendedTicketData(ticketId);
			if (response.status === 200) {
				setTicketData(response.data);
				setScannedTicketId(ticketId);
			} else {
				toaster.error({
					title: "Failed to load ticket",
					description: response.message,
				});
				resetScanner();
			}
		} catch (error) {
			console.error("Error loading ticket:", error);
			toaster.error({
				title: "Error loading ticket",
				description: (error as Error).message,
			});
			resetScanner();
		} finally {
			setIsLoading(false);
		}
	};

	// handle direct ticket view mode - load ticket immediately if ticketId is in URL
	useEffect(() => {
		if (isDirectTicketView && urlTicketId) {
			setIsScanning(false);
			loadTicketData(urlTicketId);
		}
	}, [urlTicketId, isDirectTicketView]);

	// initialize scanner when in scanning mode
	useEffect(() => {
		// cleanup existing scanner first if dependencies changed
		if (scanner) {
			scanner.clear().catch(console.error);
			setScanner(null);
			// give a small delay for cleanup to complete before creating new scanner
			setTimeout(() => {
				createNewScanner();
			}, 100);
		} else if (isScanning && scannerRef.current) {
			createNewScanner();
		}
		
		function createNewScanner() {
			if (!isScanning || !scannerRef.current) return;
			
			const qrCodeScanner = new Html5QrcodeScanner(
				"qr-reader",
				{
					fps: 10,
					qrbox: { width: 250, height: 250 },
					aspectRatio: 1.0,
					supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
					// remove formatsToSupport to allow default QR code detection
				},
				false,
			);

			qrCodeScanner.render(
				(decodedText: string) => {
					// success callback - handle rapid scan vs normal scan directly
					qrCodeScanner
						.clear()
						.then(async () => {
							setScanner(null);
							
							console.log("QR Code scanned:", decodedText);
							console.log("Current rapid scan mode:", rapidScanMode);
							console.log("Current selected item:", selectedRapidItem);
							
							// extract ticket id from url
							const ticketMatch = decodedText.match(/\/ticket\/(.+)$/);
							if (ticketMatch) {
								const ticketId = ticketMatch[1];
								
								if (rapidScanMode && selectedRapidItem) {
									// rapid scan mode - just toggle the selected item
									await handleRapidScan(ticketId, selectedRapidItem);
									// restart scanner for rapid scan mode
									setTimeout(() => {
										setIsScanning(true);
									}, 1000);
								} else {
									// normal mode - stop scanning and load full ticket data
									setIsScanning(false);
									await loadTicketData(ticketId);
								}
							} else {
								// invalid qr code
								toaster.error({
									title: "Invalid QR Code",
									description: "This doesn't appear to be a valid ticket QR code",
								});
								// restart scanner
								setTimeout(() => {
									setIsScanning(true);
								}, 1000);
							}
						})
						.catch(console.error);
				},
				(error: string) => {
					// error callback - only log meaningful errors
					if (
						!error.includes("NotFoundException") &&
						!error.includes("No MultiFormat Readers") &&
						!error.includes("parse error")
					) {
						console.warn("QR scan error:", error);
					}
				},
			);

			setScanner(qrCodeScanner);
		}

		// cleanup function
		return () => {
			if (scanner) {
				scanner.clear().catch(console.error);
				setScanner(null);
			}
		};
	}, [isScanning, rapidScanMode, selectedRapidItem]);

	// cleanup scanner on component unmount
	useEffect(() => {
		return () => {
			if (scanner) {
				scanner.clear().catch(console.error);
			}
		};
	}, []);

	// toggle event/meal status
	const toggleEventStatus = async (eventId: string, isChecked: boolean) => {
		if (!scannedTicketId || !ticketData) return;

		try {
			const action = isChecked ? "uncheck" : "check";
			const response = await redeemItem(scannedTicketId, eventId, action);

			if (response.status === 200) {
				// update local state
				setTicketData({
					...ticketData,
					events: response.data,
				});

				toaster.success({
					title: `${isChecked ? "Unchecked" : "Checked"} successfully`,
					description: "",
				});
			} else {
				toaster.error({
					title: "Failed to update status",
					description: response.message,
				});
			}
		} catch (error) {
			console.error("Error toggling event status:", error);
			toaster.error({
				title: "Error updating status",
				description: (error as Error).message,
			});
		}
	};

	// reset scanner to scan new ticket
	const resetScanner = () => {
		setTicketData(null);
		setScannedTicketId(null);
		setRapidScanMode(false);
		setSelectedRapidItem(null);
		setLastScannedPerson("");
		setLastScannedTicketId("");
		setLastAction(null);
		setRecentScans(new Set());
		setSearchQuery("");
		setSearchResults([]);

		// cleanup existing scanner
		if (scanner) {
			scanner.clear().catch(console.error);
			setScanner(null);
		}

		// if we're in direct ticket view mode, navigate back to admin scan
		if (isDirectTicketView) {
			navigate("/admin/scan");
		} else {
			setIsScanning(true);
		}
	};

	// enter rapid scan mode
	const enterRapidScanMode = (item: {
		id: string;
		title: string;
		type: "food" | "event";
	}) => {
		setSelectedRapidItem(item);
		setRapidScanMode(true);
		setTicketData(null);
		setScannedTicketId(null);
		setIsScanning(true);
	};

	// exit rapid scan mode
	const exitRapidScanMode = () => {
		setRapidScanMode(false);
		setSelectedRapidItem(null);
		setLastScannedPerson("");
		setLastScannedTicketId("");
		setLastAction(null);
	};

	// html5-qrcode handles camera switching internally via its UI

	// search for participants by name or email
	const searchParticipants = async (query: string) => {
		if (query.trim().length < 2) {
			setSearchResults([]);
			return;
		}

		setIsSearching(true);
		try {
			// search in applications collection by name or email
			const applicationsRef = collection(firestore, "applications");

			// search by email (exact match)
			const emailQuery = firestoreQuery(
				applicationsRef,
				where("email", ">=", query.toLowerCase()),
				where("email", "<=", `${query.toLowerCase()}\uf8ff`),
				limit(10),
			);

			// search by first name
			const firstNameQuery = firestoreQuery(
				applicationsRef,
				where("firstName", ">=", query),
				where("firstName", "<=", `${query}\uf8ff`),
				limit(10),
			);

			// search by last name
			const lastNameQuery = firestoreQuery(
				applicationsRef,
				where("lastName", ">=", query),
				where("lastName", "<=", `${query}\uf8ff`),
				limit(10),
			);

			const [emailResults, firstNameResults, lastNameResults] =
				await Promise.all([
					getDocs(emailQuery),
					getDocs(firstNameQuery),
					getDocs(lastNameQuery),
				]);

			// combine and deduplicate results
			const allResults = new Map();

			[emailResults, firstNameResults, lastNameResults].forEach((snapshot) => {
				snapshot.docs.forEach((doc) => {
					const data = doc.data() as {
						applicantId: string;
						firstName: string;
						lastName: string;
						email: string;
					};
					const ticketId = `ticket_${data.applicantId}`;
					allResults.set(data.applicantId, {
						ticketId,
						name: `${data.firstName} ${data.lastName}`,
						email: data.email,
					});
				});
			});

			setSearchResults(Array.from(allResults.values()).slice(0, 10));
		} catch (error) {
			console.error("Error searching participants:", error);
			toaster.error({
				title: "Search failed",
				description: "Unable to search participants. Please try again.",
			});
		} finally {
			setIsSearching(false);
		}
	};

	// load ticket from search result
	const loadTicketFromSearch = async (ticketId: string) => {
		setIsScanning(false);
		setSearchQuery("");
		setSearchResults([]);
		await loadTicketData(ticketId);
	};

	// undo last rapid scan action
	const undoLastScan = async () => {
		if (!lastScannedTicketId || !selectedRapidItem || !lastAction) {
			toaster.error({
				title: "Cannot undo",
				description: "No recent scan to undo",
			});
			return;
		}

		try {
			// reverse the last action
			const reverseAction = lastAction === "check" ? "uncheck" : "check";
			const response = await redeemItem(
				lastScannedTicketId,
				selectedRapidItem.id,
				reverseAction,
			);

			if (response.status === 200) {
				const statusText =
					reverseAction === "check"
						? selectedRapidItem.type === "food"
							? "Fed"
							: "Checked in"
						: selectedRapidItem.type === "food"
							? "Unfed"
							: "Checked out";

				toaster.success({
					title: `Undone: ${statusText} ${lastScannedPerson}`,
					description: `${selectedRapidItem.title}`,
				});

				// clear undo state
				setLastScannedPerson("");
				setLastScannedTicketId("");
				setLastAction(null);
			} else {
				toaster.error({
					title: "Failed to undo",
					description: response.message,
				});
			}
		} catch (error) {
			console.error("Error undoing scan:", error);
			toaster.error({
				title: "Error undoing scan",
				description: (error as Error).message,
			});
		}
	};

	// check if user has admin or volunteer access
	if (
		!currentUser?.hawkAdmin &&
		currentUser?.type !== "volunteer" &&
		currentUser?.type !== "volunteer.t2"
	) {
		return (
			<PageWrapper>
				<Card.Root rounded="4xl" maxW="400px" mx="auto">
					<CardBody textAlign="center" py={8}>
						<Icon as={FaQrcode} color="red.400" fontSize="3xl" mb={4} />
						<Heading size="md" color="red.400" mb={2}>
							Admin Access Required
						</Heading>
						<Text color="gray.400" fontSize="sm">
							You need admin permissions to access this scanner.
						</Text>
					</CardBody>
				</Card.Root>
			</PageWrapper>
		);
	}

	// loading state
	if (isLoading) {
		return <LoadingAnimation />;
	}

	// scanner view
	if (isScanning) {
		const allItems = [
			...events
				.filter((e) => {
					const type = e.type.toLowerCase();
					return type === "food" || type === "meal";
				})
				.map((e) => ({
					id: e.id,
					title: `🍽 ${e.title}`,
					type: "food" as const,
					originalTitle: e.title,
				})),
			...events
				.filter((e) => {
					const type = e.type.toLowerCase();
					return type !== "food" && type !== "meal";
				})
				.map((e) => ({
					id: e.id,
					title: `🎯 ${e.title}`,
					type: "event" as const,
					originalTitle: e.title,
				})),
		];

		return (
			<PageWrapper>
				<Flex direction="column" gap={4} maxW="500px" mx="auto">
					{/* Scanner Card */}
					<Card.Root rounded="4xl">
						<CardHeader textAlign="center">
							<Flex direction="column" gap={2}>
								<Icon as={FaQrcode} color="#f9a857" fontSize="3xl" />
								<Heading size="lg" color="white">
									{rapidScanMode ? "Rapid Scan Mode" : "Admin QR Scanner"}
								</Heading>
								{rapidScanMode && selectedRapidItem ? (
									<Flex direction="column" gap={1}>
										<Text color="#f9a857" fontSize="md" fontWeight="bold">
											{selectedRapidItem.title}
										</Text>
										<Text color="gray.400" fontSize="sm">
											Scanning for:{" "}
											{selectedRapidItem.type === "food" ? "Meal" : "Event"}
										</Text>
									</Flex>
								) : (
									<Text color="gray.400" fontSize="sm">
										Point camera at ticket QR code to scan
									</Text>
								)}
							</Flex>
						</CardHeader>
						<CardBody>
							<Box
								position="relative"
								width="100%"
								aspectRatio="4/3"
								overflow="hidden"
								borderRadius="2xl"
								bg="#1a1a1a"
							>
								<div
									id="qr-reader"
									ref={scannerRef}
									style={{
										width: "100%",
										height: "100%",
									}}
								/>

								{/* html5-qrcode provides its own camera controls */}
							</Box>

							{/* Rapid Scan Mode Selector */}
							{!rapidScanMode ? (
								<Box mt={4}>
									<Text
										color="gray.400"
										fontSize="sm"
										mb={3}
										textAlign="center"
									>
										Select an item to enable rapid scan mode
									</Text>
									{allItems.length === 0 ? (
										<Box
											p={4}
											bg="#2d1b1b"
											borderRadius="xl"
											border="1px solid #dc2626"
										>
											<Text
												fontSize="sm"
												fontWeight="bold"
												color="#f87171"
												mb={2}
											>
												! No Events Available
											</Text>
										</Box>
									) : (
										<Select
											label=""
											placeholder="Choose event or meal to rapid scan"
											options={allItems.map((item) => item.title)}
											onChange={(selected) => {
												if (selected && selected.length > 0) {
													const selectedTitle = selected[0];
													const item = allItems.find(
														(i) => i.title === selectedTitle,
													);
													if (item) {
														enterRapidScanMode({
															id: item.id,
															title: item.originalTitle,
															type: item.type,
														});
													}
												}
											}}
										/>
									)}
								</Box>
							) : (
								/* Rapid Scan Status */
								<Flex direction="column" gap={3} mt={4}>
									{lastScannedPerson && (
										<Box
											p={3}
											bg="#1f2937"
											borderRadius="xl"
											textAlign="center"
										>
											<Text color="#f9a857" fontSize="sm" fontWeight="bold">
												Last Scanned: {lastScannedPerson}
											</Text>
										</Box>
									)}
									<Flex gap={2}>
										{lastScannedPerson && lastAction && (
											<Button
												onClick={undoLastScan}
												variant="outline"
												rounded="full"
												size="sm"
												color="#f9a857"
												borderColor="#f9a857"
												_hover={{ bg: "#f9a857", color: "black" }}
												flex={1}
											>
												<Icon as={FaUndo} mr={1} />
												Undo
											</Button>
										)}
										<Button
											onClick={exitRapidScanMode}
											variant="outline"
											rounded="full"
											size="sm"
											color="gray.400"
											borderColor="gray.500"
											flex={1}
										>
											Exit Rapid Scan
										</Button>
									</Flex>
								</Flex>
							)}
						</CardBody>
					</Card.Root>

					{/* Manual Search Card */}
					<Card.Root rounded="4xl">
						<CardHeader>
							<Heading size="md" color="white" textAlign="center">
								Manual Search
							</Heading>
						</CardHeader>
						<CardBody>
							<Text color="gray.400" fontSize="sm" mb={4} textAlign="center">
								Search by name or email to find a participant
							</Text>
							<TextInput
								label=""
								placeholder="Search by name or email..."
								value={searchQuery}
								onChange={(e) => {
									const value = e.target.value;
									setSearchQuery(value);
									searchParticipants(value);
								}}
							/>

							{isSearching && (
								<Box mt={3} textAlign="center">
									<Text color="gray.400" fontSize="sm">
										Searching...
									</Text>
								</Box>
							)}

							{searchResults.length > 0 && (
								<Box mt={3}>
									<Text color="gray.400" fontSize="sm" mb={2}>
										Found {searchResults.length} participants:
									</Text>
									<Flex direction="column" gap={2}>
										{searchResults.map((result) => (
											<Box
												key={result.ticketId}
												as="button"
												onClick={() => loadTicketFromSearch(result.ticketId)}
												p={3}
												bg="#1f2937"
												borderRadius="xl"
												border="1px solid #374151"
												_hover={{ bg: "#374151", borderColor: "#f9a857" }}
												textAlign="left"
												w="full"
											>
												<Text fontWeight="medium" color="white" mb={1}>
													{result.name}
												</Text>
												<Text fontSize="sm" color="gray.400">
													{result.email}
												</Text>
											</Box>
										))}
									</Flex>
								</Box>
							)}

							{searchQuery.length >= 2 &&
								!isSearching &&
								searchResults.length === 0 && (
									<Box mt={3} textAlign="center">
										<Text color="gray.400" fontSize="sm">
											No participants found matching "{searchQuery}"
										</Text>
									</Box>
								)}
						</CardBody>
					</Card.Root>
				</Flex>
			</PageWrapper>
		);
	}

	// ticket data view
	if (ticketData) {
		const foodEvents = events.filter((e) => {
			const type = e.type.toLowerCase();
			return type === "food" || type === "meal";
		});
		const otherEvents = events.filter((e) => {
			const type = e.type.toLowerCase();
			return type !== "food" && type !== "meal";
		});

		return (
			<PageWrapper>
				<Flex direction="column" gap={6} maxW="600px" mx="auto">
					{/* participant header */}
					<Card.Root rounded="4xl">
						<CardHeader>
							<Flex justify="space-between" align="center" gap={4}>
								<Box flex={1} mb={4}>
									<Heading size="lg" color="white">
										{ticketData.firstName} {ticketData.lastName}
									</Heading>
									{ticketData.pronouns && (
										<Text color="gray.400" fontSize="sm" mt={1}>
											{ticketData.pronouns}
										</Text>
									)}
									{isDirectTicketView && (
										<Text color="#f9a857" fontSize="sm" mt={2}>
											Ticket ID: {urlTicketId}
										</Text>
									)}
								</Box>
								<Button
									onClick={resetScanner}
									rounded="full"
									bg="#f9a857"
									color="black"
									size="sm"
									_hover={{ bg: "#e0974d" }}
								>
									<Icon as={MdRefresh} mr={1} />
									{isDirectTicketView ? "Back to Scanner" : "Scan New"}
								</Button>
							</Flex>
						</CardHeader>
						{ticketData.allergies &&
							Array.isArray(ticketData.allergies) &&
							ticketData.allergies.length > 0 && (
								<CardBody pt={0}>
									<Box
										p={3}
										bg="#2d1b1b"
										borderRadius="lg"
										border="1px solid"
										borderColor="#dc2626"
									>
										<Text
											fontSize="sm"
											fontWeight="bold"
											color="#f87171"
											mb={2}
										>
											! ALLERGIES
										</Text>
										<Text fontSize="sm" color="#fca5a5">
											{ticketData.allergies.join(", ")}
										</Text>
									</Box>
								</CardBody>
							)}
					</Card.Root>

					{/* meals section */}
					<Card.Root rounded="4xl">
						<CardHeader>
							<Flex align="center" gap={2}>
								<Icon as={FaUtensils} color="#f9a857" />
								<Heading size="md" color="white">
									Meals
								</Heading>
							</Flex>
						</CardHeader>
						<CardBody>
							<Flex direction="column" gap={3}>
								{foodEvents.length > 0 ? (
									foodEvents.map((meal) => {
										const isChecked = ticketData.events.includes(meal.id);
										return (
											<Flex
												key={meal.id}
												justify="space-between"
												align="center"
												p={4}
												bg={isChecked ? "#1f2937" : "#1f1e2d"}
												borderRadius="2xl"
												border="2px solid"
												borderColor={isChecked ? "#f9a857" : "#374151"}
											>
												<Box flex={1}>
													<Text fontWeight="medium" mb={1} color="white">
														{meal.title}
													</Text>
													<Text fontSize="sm" color="gray.400">
														{meal.location}
													</Text>
												</Box>
												<Button
													bg={isChecked ? "#dc2626" : "#f9a857"}
													color="white"
													rounded="full"
													size="sm"
													onClick={() => toggleEventStatus(meal.id, isChecked)}
													_hover={{ bg: isChecked ? "#b91c1c" : "#e0974d" }}
												>
													{isChecked && <Icon as={FaCheck} mr={1} />}
													{isChecked ? "Fed" : "Feed"}
												</Button>
											</Flex>
										);
									})
								) : (
									<Text
										color="gray.400"
										fontSize="sm"
										textAlign="center"
										py={4}
									>
										No meals available
									</Text>
								)}
							</Flex>
						</CardBody>
					</Card.Root>

					{/* all events quick access */}
					<Card.Root rounded="4xl">
						<CardHeader>
							<Heading size="md" color="white">
								Quick Event Check-in
							</Heading>
						</CardHeader>
						<CardBody>
							<Box maxH="400px" overflowY="auto">
								<Flex direction="column" gap={2}>
									{otherEvents.map((event) => {
										const isChecked = ticketData.events.includes(event.id);
										return (
											<Flex
												key={event.id}
												justify="space-between"
												align="center"
												p={3}
												bg={isChecked ? "#1f2937" : "#1f1e2d"}
												borderRadius="xl"
												border="1px solid"
												borderColor={isChecked ? "#8b5cf6" : "#374151"}
											>
												<Box flex={1}>
													<Text
														fontSize="sm"
														fontWeight="medium"
														mb={1}
														color="white"
													>
														{event.title}
													</Text>
													<Flex gap={2} align="center">
														<Badge
															size="sm"
															bg={isChecked ? "#8b5cf6" : "#6b7280"}
															color="white"
															variant="solid"
														>
															{event.type}
														</Badge>
														<Text fontSize="xs" color="gray.400">
															{event.location}
														</Text>
													</Flex>
												</Box>
												<Button
													size="xs"
													bg={isChecked ? "#dc2626" : "#8b5cf6"}
													color="white"
													rounded="full"
													onClick={() => toggleEventStatus(event.id, isChecked)}
													_hover={{ bg: isChecked ? "#b91c1c" : "#7c3aed" }}
												>
													{isChecked ? "✓" : "+"}
												</Button>
											</Flex>
										);
									})}
								</Flex>
							</Box>
						</CardBody>
					</Card.Root>
				</Flex>
			</PageWrapper>
		);
	}

	return null;
};
