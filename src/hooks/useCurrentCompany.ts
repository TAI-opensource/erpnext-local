import { useAtomValue } from "jotai"
import { atomWithStorage } from "jotai/utils"

function getDefaultCompany(): string {
    const frappe = window as any
    return frappe?.frappe?.boot?.user?.defaults?.company
        || frappe?.frappe?.boot?.defaults?.company
        || '_Test Company'
}

export const selectedCompanyAtom = atomWithStorage<string>('bank-rec-selected-company', getDefaultCompany())

export const useCurrentCompany = () => {
    const selectedCompany = useAtomValue(selectedCompanyAtom)
    return selectedCompany || getDefaultCompany()
}