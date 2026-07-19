import { SignUp } from "@clerk/nextjs";
import { Logo } from "@/components/Logo";

export default function Page() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
      <div className="flex items-center gap-2.5">
        <Logo className="w-8 h-8 text-navy-900" />
        <span className="font-serif text-2xl text-navy-950 tracking-tight">AR Assistant</span>
      </div>
      <SignUp
        appearance={{
          variables: {
            colorPrimary: "#0f1f38",
            colorBackground: "#fbf8f2",
            colorForeground: "#0f1f38",
            colorMutedForeground: "#203f66",
            colorInput: "#fbf8f2",
            colorInputForeground: "#0f1f38",
            borderRadius: "0.5rem",
          },
          elements: {
            card: "shadow-md border border-navy-900/10",
          },
        }}
      />
    </div>
  );
}
