import { HeaderClient } from "./header-client"
import { getRegionFromCookies } from "@/lib/region"

export async function Header() {
  const region = await getRegionFromCookies()

  return <HeaderClient region={region} />
}
