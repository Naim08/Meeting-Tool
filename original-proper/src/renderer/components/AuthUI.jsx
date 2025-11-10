"use client";

import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import React from "react";

export default function AuthUI({ supabase }) {
  return (
    <div className="w-full">
      <Auth
        supabaseClient={supabase}
        providers={["github", "google"]}
        // magicLink={true}
        theme="dark"
        redirectTo="http://localhost/interviewSolverCallback"
        showLinks={false}
        queryParams={{
          prompt: "select_account",
        }}
        appearance={{
          theme: ThemeSupa,
          variables: {
            default: {
              colors: {
                brand: "rgb(37, 99, 235)",
                brandAccent: "rgb(29, 78, 216)",
                brandButtonText: "white",
                inputBorder: "rgb(75, 85, 99)",
                inputText: "white",
                inputPlaceholder: "rgb(156, 163, 175)",
                inputLabelText: "rgb(209, 213, 219)",
                inputBackground: "rgb(31, 41, 55)",
                anchorTextColor: "rgb(156, 163, 175)",
                dividerText: "rgb(156, 163, 175)",
              },
              borderWidths: {
                buttonBorderWidth: "1px",
                inputBorderWidth: "1px",
              },
              radii: {
                borderRadiusButton: "0.375rem",
                buttonBorderRadius: "0.375rem",
                inputBorderRadius: "0.375rem",
              },
              fontSizes: {
                baseBodySize: "14px",
                baseInputSize: "14px",
                baseLabelSize: "13px",
                baseButtonSize: "14px",
              },
            },
          },
          style: {
            button: {
              borderWidth: "1px",
              padding: "0.75rem 1rem",
              background: "rgb(37, 99, 235)",
              borderColor: "rgb(37, 99, 235)",
              color: "white",
              transition: "all 0.15s ease",
              fontWeight: "500",
              filter: "none",
            },
            anchor: {
              color: "rgb(156, 163, 175)",
              textDecoration: "none",
              fontWeight: "400",
            },
            container: {
              background: "transparent",
            },
            label: {
              color: "rgb(209, 213, 219)",
              fontWeight: "500",
              fontSize: "13px",
            },
            message: {
              padding: "0.75rem",
              marginBottom: "0.75rem",
              borderRadius: "0.375rem",
              backgroundColor: "rgb(31, 41, 55)",
              color: "rgb(209, 213, 219)",
              border: "1px solid rgb(55, 65, 81)",
            },
            input: {
              padding: "0.75rem",
              backgroundColor: "rgb(31, 41, 55)",
              borderColor: "rgb(75, 85, 99)",
              color: "white",
              borderWidth: "1px",
              borderRadius: "0.375rem",
              transition: "border-color 0.15s ease",
            },
          },
        }}
      />
      <div className="w-full text-center mt-6">
        <a
          className="text-gray-400 hover:text-gray-300 transition-colors duration-150 font-normal text-sm"
          target="_blank"
          href="https://interviewsolver.com/signin"
        >
          Need an account? Sign up here
        </a>
      </div>
    </div>
  );
}
