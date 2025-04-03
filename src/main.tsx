import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";

import { Provider } from "@/components/ui/provider";

import { Router } from "@/navigation";
import { AuthProvider } from "@providers";
import { NotificationProvider } from "./providers/notification.provider";
import { RoutesProvider } from "./providers/routes.provider";

// for funsies
console.log("If you found this, you are a curious one! 😄");
console.log("BUT we are not hiring at the moment ^_^");
console.log(`App version: ${APP_VERSION}`);
console.log(`App env: ${import.meta.env.MODE}`);

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <Provider>
            <NotificationProvider>
                <AuthProvider>
                    <RoutesProvider>
                        <Router />
                    </RoutesProvider>
                </AuthProvider>
            </NotificationProvider>
        </Provider>
    </React.StrictMode>
);
