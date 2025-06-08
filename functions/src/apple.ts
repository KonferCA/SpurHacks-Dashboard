import axios from "axios";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { error as logError, info as logInfo } from "firebase-functions/logger";
import { type CallableRequest, HttpsError, onCall } from "firebase-functions/v2/https";
import * as fs from "node:fs";
import * as path from "node:path";
import { PKPass } from "passkit-generator";
import { v4 as uuidv4 } from "uuid";

const signerCert = process.env.APPLE_WALLET_CERTS_SIGNER_CERT;
const signerKey = process.env.APPLE_WALLET_CERTS_SIGNER_KEY;
const wwdr = process.env.APPLE_WALLET_CERTS_WWDR_CERT;
const signerKeyPassphrase =
  process.env.APPLE_WALLET_CERTS_SIGNER_KEY_PASSPHRASE;
const teamIdentifier = process.env.APPLE_WALLET_CERTS_TEAM_ID;

// apple wallet ticket
export const createTicket = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    logError("createTicket: Not authenticated - request.auth is missing.");
    throw new HttpsError("permission-denied", "Not authenticated");
  }
  const contextAuth = request.auth;
  logInfo("createTicket: Auth context present:", contextAuth);

  try {
    const userId = contextAuth.uid;

    const user = await getAuth().getUser(userId);
    const app = (
      await getFirestore()
        .collection("applications")
        .where("applicantId", "==", userId)
        .get()
    ).docs[0]?.data();

    let firstName = app?.firstName;
    let lastName = app?.lastName;
    if (!app) {
      logInfo(
        "No application found for user. Will try to get name from user record.",
      );
      const [f, l] = user?.displayName?.split(" ") ?? [
        user.customClaims?.type ?? "N/A",
        "N/A",
      ];
      firstName = f;
      lastName = l;
    }

    const ticketsRef = getFirestore().collection("tickets");
    const ticketDoc = (await ticketsRef.where("userId", "==", userId).get())
      .docs[0];
    let ticketId = "";
    if (!ticketDoc) {
      ticketId = uuidv4();
      await ticketsRef.doc(ticketId).set({
        userId: userId,
        ticketId: ticketId,
        firstName: firstName,
        lastName: lastName,
        timestamp: new Date(),
      });
    } else {
      ticketId = ticketDoc.id;
      await ticketsRef.doc(ticketId).update({
        userId: userId,
        ticketId: ticketId,
        firstName: firstName,
        lastName: lastName,
        timestamp: new Date(),
      });
    }

    const passJsonBuffer = Buffer.from(
      JSON.stringify({
        passTypeIdentifier: "pass.pass.com.spurhacks.eventticket",
        formatVersion: 1,
        teamIdentifier: teamIdentifier,
        organizationName: "SpurHacks",
        serialNumber: ticketId,
        description: "SpurHacks 2025 Event Pass",
        foregroundColor: "rgb(255, 255, 255)",
        backgroundColor: "rgb(31, 30, 46)",
        labelColor: "rgb(170, 170, 185)",
        logoText: "SPURHACKS",
        barcodes: [
          {
            message: `${process.env.FE_URL}/ticket/${ticketId}`,
            format: "PKBarcodeFormatQR",
            messageEncoding: "iso-8859-1",
          },
        ],
        locations: [
          {
            latitude: 29.584,
            longitude: -98.6194,
            relevantText: "SpurHacks Event Entrance",
          },
        ],
        generic: {
          headerFields: [
            {
              key: "userRole",
              label: "",
              value: "Hacker",
            },
          ],
          primaryFields: [
            {
              key: "attendeeName",
              label: "ATTENDEE",
              value: `${firstName} ${lastName}`,
            },
          ],
          secondaryFields: [
            {
              key: "eventLocation",
              label: "EVENT ADDRESS",
              value: "SPUR Campus, Rim C",
            },
            {
              key: "eventDate",
              label: "DATE",
              value: "2025-06-20",
              textAlignment: "PKTextAlignmentRight",
            },
          ],
          backFields: [
            {
              key: "moreInfo",
              label: "More Info",
              value:
                "For more details, visit our website at spurhacks.com or contact support@spurhacks.com",
            },
            {
              key: "emergencyContact",
              label: "Emergency Contact",
              value: "911",
            },
          ],
        },
        images: {
          logo: {
            filename: "logo.png",
          },
          "logo@2x": {
            filename: "logo@2x.png",
          },
          icon: {
            filename: "icon.png",
          },
          "icon@2x": {
            filename: "icon@2x.png",
          },
          strip: {
            filename: "strip.png",
          },
          "strip@2x": {
            filename: "strip@2x.png",
          },
        },
      }),
    );

    // Load local SPUR logo PNG (will need white/light version for dark theme)
    const spurLogoPath = path.join(
      __dirname,
      "..",
      "assets",
      "spur-logo-white.png",
    );
    let spurLogoBuffer: Buffer;
    try {
      spurLogoBuffer = fs.readFileSync(spurLogoPath);
    } catch (error) {
      // Fallback to black logo if white version doesn't exist yet
      const fallbackLogoPath = path.join(
        __dirname,
        "..",
        "assets",
        "spur-logo-black.png",
      );
      spurLogoBuffer = fs.readFileSync(fallbackLogoPath);
    }

    // Fetch a PNG icon for icon.png and icon@2x.png (using hawkhacks as placeholder)
    const iconResponse = await axios.get("https://hawkhacks.ca/icon.png", {
      responseType: "arraybuffer",
    });
    const icon2xResponse = await axios.get("https://hawkhacks.ca/icon.png", {
      responseType: "arraybuffer",
    });
    const iconBuffer = Buffer.from(iconResponse.data);
    const icon2xBuffer = Buffer.from(icon2xResponse.data);

    // load local strip images for the new design
    // ensure these files exist in functions/assets/dark-theme/
    let stripImageBuffer: Buffer | undefined;
    let stripImage2xBuffer: Buffer | undefined;
    try {
      const stripPath = path.join(__dirname, "..", "assets", "dark-theme", "strip.png");
      stripImageBuffer = fs.readFileSync(stripPath);
      const strip2xPath = path.join(__dirname, "..", "assets", "dark-theme", "strip@2x.png");
      stripImage2xBuffer = fs.readFileSync(strip2xPath);
    } catch (err) {
      logError("Error loading strip images. Please ensure strip.png and strip@2x.png exist in functions/assets/dark-theme/", err);
      // you might want to throw an error here or use a fallback image if critical
    }

    if (!signerCert || !signerKey || !wwdr) {
      logError("Missing required Apple certificates", {
        signerCert: !!signerCert,
        signerKey: !!signerKey,
        wwdr: !!wwdr,
      });
      throw new HttpsError(
        "internal",
        "Server Configuration Error: Missing required certificates",
      );
    }

    const passTemplateFiles: { [key: string]: Buffer } = {
      "pass.json": passJsonBuffer,
      "icon.png": iconBuffer,
      "icon@2x.png": icon2xBuffer,
      "logo.png": spurLogoBuffer,
      "logo@2x.png": spurLogoBuffer,
    };

    // add strip images to the template if they were loaded successfully
    if (stripImageBuffer) {
      passTemplateFiles["strip.png"] = stripImageBuffer;
    }
    if (stripImage2xBuffer) {
      passTemplateFiles["strip@2x.png"] = stripImage2xBuffer;
    }

    const certificatesPayload: {
      signerCert: string | Buffer;
      signerKey: string | Buffer;
      wwdr: string | Buffer;
      signerKeyPassphrase?: string;
    } = {
      signerCert: signerCert,
      signerKey: signerKey,
      wwdr: wwdr,
    };

    if (signerKeyPassphrase && signerKeyPassphrase.trim() !== "") {
      certificatesPayload.signerKeyPassphrase = signerKeyPassphrase;
    }

    logInfo(
      "PKPass Signer Cert Input (JSON):",
      JSON.stringify(certificatesPayload.signerCert),
    );
    logInfo(
      "PKPass Signer Key Input (JSON):",
      JSON.stringify(certificatesPayload.signerKey),
    );
    logInfo(
      "PKPass WWDR Cert Input (JSON):",
      JSON.stringify(certificatesPayload.wwdr),
    );
    if (certificatesPayload.signerKeyPassphrase) {
      logInfo(
        "PKPass Passphrase Input (JSON):",
        JSON.stringify(certificatesPayload.signerKeyPassphrase),
      );
    }

    const pass = new PKPass(passTemplateFiles, certificatesPayload);

    const buffer = pass.getAsBuffer();

    const storageRef = getStorage().bucket();
    const fileRef = storageRef.file(`passes/${userId}/pass.pkpass`);
    await fileRef.save(buffer, {
      metadata: {
        contentType: "application/vnd.apple.pkpass",
      },
    });

    await fileRef.makePublic();
    const passUrl = fileRef.publicUrl();

    return { url: passUrl };
  } catch (error) {
    logError("createTicket: Full error object in catch:", error);
    if (error instanceof Error) {
      logError("createTicket: Error message:", error.message);
      logError("createTicket: Error stack:", error.stack);
    }
    logError("Error creating ticket:", { error });
    throw new HttpsError(
      "internal",
      "Failed to create ticket",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
});
