const HR_DATA = {
  employees: [
    {id:1,name:'Rahul Sharma',role:'Regional Sales Manager',department:'Sales & BD',manager:'Abhilash Pandey',location:'Gurugram',attendance:96.2,kra:84,status:'Green',tenure:'3.8 yrs',joining:'12 Nov 2022',band:'M3',leave:'14 days',training:'18 hrs',recognition:'2 awards',timeline:['Jul 2026 · KRA score 84%','Jun 2026 · Product certification completed','Apr 2026 · Promoted to Regional Sales Manager']},
    {id:2,name:'Amit Verma',role:'Business Development Manager',department:'Sales & BD',manager:'Lalit',location:'Gurugram',attendance:91.4,kra:67,status:'Yellow',tenure:'2.2 yrs',joining:'04 Jun 2024',band:'M2',leave:'9 days',training:'11 hrs',recognition:'0 awards',timeline:['Jul 2026 · Yellow performance card','Jun 2026 · Attendance warning','May 2026 · Coaching plan started']},
    {id:3,name:'Neha Gupta',role:'Finance Manager',department:'Finance',manager:'CFO',location:'Gurugram',attendance:97.8,kra:91,status:'Green',tenure:'5.1 yrs',joining:'21 Jul 2021',band:'M3',leave:'17 days',training:'24 hrs',recognition:'3 awards',timeline:['Jul 2026 · KRA 91%','Jun 2026 · Recognition award','Apr 2026 · Audit lead']},
    {id:4,name:'Rohit Singh',role:'Shift Supervisor',department:'Production',manager:'Plant Head',location:'Gurugram',attendance:84.1,kra:61,status:'PIP',tenure:'4.6 yrs',joining:'03 Jan 2022',band:'S2',leave:'4 days',training:'8 hrs',recognition:'0 awards',timeline:['Jul 2026 · PIP initiated','Jun 2026 · Red performance card','May 2026 · Attendance escalation']}
  ],
  alerts: [
    {priority:'Critical',action:'Healthcare Business Head role open 81 days',owner:'Suman · TA',due:'29 Aug',status:'Open'},
    {priority:'Critical',action:'2 Sales PIP cases approaching cycle-end review',owner:'Abhilash',due:'31 Aug',status:'In Progress'},
    {priority:'High',action:'Plant absenteeism at 11.2% — Mon/Fri pattern',owner:'Plant HR',due:'30 Aug',status:'Open'},
    {priority:'High',action:'Attendance sync issue bucket not falling',owner:'HRIS',due:'02 Sep',status:'In Progress'}
  ],
  requisitions: [
    {role:'Healthcare Business Head',dept:'Sales',owner:'Suman',stage:'Sourcing',days:81},
    {role:'BDM — West',dept:'Sales',owner:'Naman',stage:'Interview',days:58},
    {role:'QC Engineer',dept:'Quality',owner:'Rishita',stage:'Interview',days:44},
    {role:'PCB Design Engineer',dept:'Engineering',owner:'Nainika',stage:'Offer',days:29},
    {role:'HR Executive — Plant',dept:'HR',owner:'Snigdha',stage:'Joined',days:17}
  ]
};
