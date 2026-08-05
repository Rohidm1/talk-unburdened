import listener1 from "@/assets/listener-1.jpg";
import listener2 from "@/assets/listener-2.jpg";
import listener3 from "@/assets/listener-3.jpg";
import listener4 from "@/assets/listener-4.jpg";

export const avatarByKey: Record<string, string> = {
  "listener-1": listener1,
  "listener-2": listener2,
  "listener-3": listener3,
  "listener-4": listener4,
};

export function avatarFor(key: string): string {
  return avatarByKey[key] ?? listener1;
}
