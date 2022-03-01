import React, { useState, useEffect } from "react";
import { AUTH0_DOMAIN, AUTH0_CLIENT_ID } from "@env";
import SInfo from "react-native-sensitive-info";
import Auth0 from "react-native-auth0";
import DeviceInfo from "react-native-device-info";
import jwtDecode from "jwt-decode";

const auth0 = new Auth0({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
});

const AuthContext = React.createContext();

const AuthContextProvider = (props) => {
  const [loading, setLoading] = useState(true);
  const [loggedIn, setLoggedIn] = useState(null);
  const [userData, setUserData] = useState(null);

  const getUserData = async (id) => {
    const idToken = id ? id : await SInfo.getItem("idToken", {});
    const { name, picture, exp } = jwtDecode(idToken);

    if (exp < Date.now() / 1000) {
      throw new Error("ID token expired!");
    }

    return {
      name,
      picture,
    };
  };

  // executed on first app load
  useEffect(() => {
    (async () => {
      try {
        const user_data = await getUserData();

        setLoggedIn(true);
        setUserData(user_data);
      } catch (err) {
        try {
          const refreshToken = await SInfo.getItem("refreshToken", {});
          const newIdTokenResponse = await auth0.auth.refreshToken({
            refreshToken,
          });

          await SInfo.setItem("idToken", newIdTokenResponse.idToken, {});

          const user_data = await getUserData(newIdTokenResponse.idToken);
          if (user_data) {
            setLoggedIn(true);
            setUserData(user_data);
          }
        } catch (err) {
          setLoggedIn(false);
        }
      }
    })();
  }, []);

  // executed when user just logged in
  useEffect(() => {
    (async () => {
      try {
        if (loggedIn) {
          const user_data = await getUserData();

          if (user_data) {
            setLoggedIn(true);
            setUserData(user_data);
          }
        }
      } catch (err) {
        alert("Error logging in");
      }
    })();
  }, [loggedIn]);

  const login = async () => {
    try {
      const credentials = await auth0.webAuth.authorize({
        scope: "openid offline_access email profile",
      });

      await SInfo.setItem("idToken", credentials.idToken, {});
      await SInfo.setItem("refreshToken", credentials.refreshToken, {});

      const user_data = await getUserData(credentials.idToken);

      setLoggedIn(true);
      setUserData(user_data);
    } catch (err) {
      alert("Error logging in");
    }
  };

  const logout = async () => {
    try {
      await auth0.webAuth.clearSession({});

      await SInfo.deleteItem("idToken", {});
      await SInfo.deleteItem("refreshToken", {});

      setLoggedIn(false);
      setUserData(null);
    } catch (err) {
      alert("Error logging out");
    }
  };

  const value = {
    loading,
    loggedIn,
    login,
    logout,
    userData,
  };

  return (
    <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>
  );
};

export { AuthContext, AuthContextProvider };
