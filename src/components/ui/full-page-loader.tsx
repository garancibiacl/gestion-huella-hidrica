import { LoaderHourglass } from "@/components/ui/loader-hourglass";

export function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9]">
      <LoaderHourglass label="Conectando con tus datos ambientales" size={48} />
    </div>
  );
}
