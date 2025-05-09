import { firestore } from "@/services/firebase";
import { HACKATHON_METADATA_COLLECTION } from "@/services/firebase/collections";
import { logEvent } from "@/services/firebase/log";
import { doc, getDoc } from "firebase/firestore";

export async function getTypeforms() {
	try {
		const docRef = doc(firestore, HACKATHON_METADATA_COLLECTION, "typeforms");
		const docSnap = await getDoc(docRef);
		if (docSnap.exists()) {
			return docSnap.data() as { mjvURL: string };
		}
	} catch (e) {
		logEvent("error", {
			event: "get_mjv_url_error",
			message: (e as Error).message,
			name: (e as Error).name,
			stack: (e as Error).stack,
		});
		throw e;
	}
}
