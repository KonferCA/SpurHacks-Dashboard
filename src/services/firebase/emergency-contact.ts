import { getDoc, doc, setDoc } from "firebase/firestore";
import { firestore } from "@/services/firebase";

const EMERGENCY_CONTACT_COLLECTION = "emergency-contacts";

export type EmergencyContact = {
	name: string;
	phone: string;
	relation: string;
};

export const getEmergencyContact = async (
	uid: string,
): Promise<EmergencyContact | null> => {
	const docRef = doc(firestore, EMERGENCY_CONTACT_COLLECTION, uid);
	const snap = await getDoc(docRef);
	if (!snap.exists()) return null;
	return snap.data() as EmergencyContact;
};

export async function saveEmergencyContact(
	userId: string,
	contact: EmergencyContact,
) {
	const docId = userId;
	const ref = doc(firestore, EMERGENCY_CONTACT_COLLECTION, docId);
	await setDoc(ref, contact, { merge: true });
}
