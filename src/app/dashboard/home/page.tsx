import ProfileDropdown from "@/app/components/shared/ProfileDropdown";

export default function Page() {
  return (
    <div>
      <h1>Dashboard Home</h1>
      <ProfileDropdown context="dashboard" />
    </div>
  );
}
