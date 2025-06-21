import { PageWrapper } from "@/components";
import { paths } from "@/providers/RoutesProvider/data";
import { Link as ChakraLink } from "@chakra-ui/react";
import { Link } from "react-router-dom";

export const AdminPage = () => {
	return (
		<PageWrapper>
			<div className="text-center rounded-xl border-2 border-black px-7 py-32 shadow-lg lg:mt-6 lg:block xl:mt-12">
				<h1 className="text-3xl font-bold">Time to Admininstrate!</h1>

				<br />

				<ul>
					<li>
						<ChakraLink
							as={Link}
							// @ts-ignore
							to={paths.adminScan}
							color="skyblue"
							textDecor="underline"
						>
							Scan QR Code
						</ChakraLink>
					</li>
				</ul>

				<br />

				<p className="text-sm mt-4">
					(If you're unsure on how to use this page, contact Amir.)
				</p>
			</div>
		</PageWrapper>
	);
};
