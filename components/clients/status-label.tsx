import { faAsterisk, faCheck, faCircle, faHourglass, faRetweet } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { FC } from "react"

type Props = {
    value: string
    size?: string
}

export const ImportStatusLabel : FC<Props> = ({value,size="normal"}) => {
    let classes = `rounded-sm uppercase tracking-wide font-bold ${(size==='small') ?  `text-sm p-1` : `p-2 text-sm`}` 
    let label = value
    let icon = faCircle
    switch(value){
        case 'CREATED':
            classes=`${classes} bg-yellow-200`
            value=`CREATA`
            icon=faAsterisk
            break
        case 'ONGOING':
            classes=`${classes} bg-yellow-200 `
            value=`IN CORSO`
            icon=faHourglass
            break
        case 'COMPLETED':
            classes=`${classes} bg-green-400 text-white`
            value="COMPLETATA"
            icon=faCheck
            break
        case 'REPLACED':
            classes=`${classes} bg-gray-300`
            value=`SOVRASCRITTA`
            icon=faRetweet
            break
        default:
            classes=`${classes} bg-gray-500`


    }
    return(
        <span className={classes}><FontAwesomeIcon icon={icon} className="mr-1"/>{value}</span>
    )
}