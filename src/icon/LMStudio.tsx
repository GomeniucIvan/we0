import type { SVGProps } from "react";

const LMStudio = (props: SVGProps<SVGSVGElement>) => (
    <svg
        width={'12px'}
        height={'12px'}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        {...props}
    >
        <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth={2} />
        <path
            d="M7 16V8M7 16h4M13 8l2 4 2-4v8"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export default LMStudio;