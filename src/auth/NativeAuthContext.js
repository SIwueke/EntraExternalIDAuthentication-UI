import React, {
    createContext,
    useContext,
} from "react";

import useNativeLogin from "../hooks/useNativeLogin";

const NativeAuthContext = createContext(null);

export const NativeAuthProvider = ({ children }) => {
    const nativeAuth = useNativeLogin();

    return (
        <NativeAuthContext.Provider value={nativeAuth}>
            {children}
        </NativeAuthContext.Provider>
    );
};

export const useNativeAuth = () => {
    const context = useContext(NativeAuthContext);

    if (!context) {
        throw new Error(
            "useNativeAuth must be used within a NativeAuthProvider."
        );
    }

    return context;
};

export default NativeAuthContext;