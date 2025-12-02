"""
RefQuest 2.0 — Sample Quests
PrecognitionOS Studio

Demo quests for testing and demonstration.
These showcase the RefQuest schema capabilities.
"""

from .quest_schema import (
    Quest,
    Step,
    QuestCategory,
    QuestMetadata,
    EvidenceRequirement,
    EvidenceType,
    VerificationMethod,
    SkillTarget,
)
from .quest_library import QuestLibrary, get_quest_library


def create_omelette_quest() -> Quest:
    """
    Demo Quest: Make an Omelette

    Classic culinary skill assessment demonstrating
    TwinFlow video analysis for cooking techniques.
    """
    quest = Quest(
        quest_id="quest-omelette-basic",
        name="basic_omelette",
        title="Make a Basic Omelette",
        description=(
            "Demonstrate fundamental cooking skills by preparing a classic "
            "French-style omelette. This quest evaluates knife skills, heat "
            "control, and plating technique."
        ),
        category=QuestCategory.TRAINING,
        difficulty="beginner",
        total_points=100,
        passing_score=70.0,
        time_limit_minutes=15.0,
        primary_skills=["cooking", "knife_skills", "heat_control"],
        secondary_skills=["plating", "food_safety", "timing"],
        required_equipment=["pan", "spatula", "bowl", "whisk", "knife", "cutting_board"],
        required_materials=["eggs", "butter", "salt", "pepper"],
        metadata=QuestMetadata(
            author="CyberHopeAI",
            version="1.0",
            tags=["cooking", "culinary", "beginner", "food"],
            keywords=["omelette", "eggs", "breakfast", "french"],
        ),
    )

    # Step 1: Crack eggs
    step1 = Step(
        step_id="step-crack-eggs",
        order=0,
        name="Crack Eggs",
        description="Crack 3 eggs into a bowl without shell fragments",
        instructions=(
            "1. Take 3 eggs\n"
            "2. Crack each egg on the edge of the bowl\n"
            "3. Open the shell and let the egg fall into the bowl\n"
            "4. Check for and remove any shell fragments"
        ),
        points=15,
        time_limit_seconds=60.0,
        expected_objects=["egg", "bowl"],
        expected_actions=["crack", "pour", "inspect"],
        safety_critical=False,
        skilldna_tags=["egg_handling", "precision"],
    )
    step1.evidence_requirements.append(EvidenceRequirement(
        evidence_type=EvidenceType.VIDEO,
        description="Video showing egg cracking technique",
        required_objects=["egg", "bowl", "hands"],
        required_actions=["crack", "pour"],
        verification_method=VerificationMethod.OBJECT,
        minimum_confidence=0.75,
    ))
    step1.skill_targets.append(SkillTarget(
        skill_id="skill-egg-crack",
        skill_name="Egg Cracking",
        skill_category="cooking",
        weight=1.0,
        skilldna_tags=["egg_handling"],
        mastery_contribution=0.1,
    ))

    # Step 2: Beat eggs
    step2 = Step(
        step_id="step-beat-eggs",
        order=1,
        name="Beat Eggs",
        description="Beat eggs until uniform with fork or whisk",
        instructions=(
            "1. Use a fork or whisk\n"
            "2. Beat the eggs vigorously\n"
            "3. Continue until yolks and whites are fully combined\n"
            "4. Add a pinch of salt and pepper"
        ),
        points=10,
        time_limit_seconds=45.0,
        expected_objects=["bowl", "whisk", "eggs"],
        expected_actions=["whisk", "beat", "mix"],
        prerequisites=["step-crack-eggs"],
        skilldna_tags=["mixing", "technique"],
    )
    step2.evidence_requirements.append(EvidenceRequirement(
        evidence_type=EvidenceType.VIDEO,
        description="Video showing beating technique",
        required_objects=["bowl", "whisk"],
        required_actions=["whisk", "beat"],
        verification_method=VerificationMethod.ACTION,
        minimum_confidence=0.70,
    ))

    # Step 3: Heat pan
    step3 = Step(
        step_id="step-heat-pan",
        order=2,
        name="Heat Pan",
        description="Heat pan to medium and add butter",
        instructions=(
            "1. Place pan on burner\n"
            "2. Set to medium heat\n"
            "3. Add 1 tablespoon of butter\n"
            "4. Wait until butter is melted and foaming"
        ),
        points=15,
        time_limit_seconds=90.0,
        expected_objects=["pan", "stove", "butter"],
        expected_actions=["place", "heat", "add"],
        safety_critical=True,
        safety_notes=["Keep handle away from heat", "Monitor temperature"],
        skilldna_tags=["heat_control", "pan_technique"],
    )
    step3.evidence_requirements.append(EvidenceRequirement(
        evidence_type=EvidenceType.VIDEO,
        description="Video showing pan heating and butter melting",
        required_objects=["pan", "butter"],
        required_actions=["heat", "melt"],
        verification_method=VerificationMethod.VISUAL,
        minimum_confidence=0.70,
    ))
    step3.skill_targets.append(SkillTarget(
        skill_id="skill-heat-control",
        skill_name="Heat Control",
        skill_category="cooking",
        weight=1.5,
        skilldna_tags=["heat_control", "temperature"],
        mastery_contribution=0.15,
    ))

    # Step 4: Pour eggs
    step4 = Step(
        step_id="step-pour-eggs",
        order=3,
        name="Pour Eggs",
        description="Pour beaten eggs into heated pan",
        instructions=(
            "1. Ensure butter is foaming but not browning\n"
            "2. Pour eggs into center of pan\n"
            "3. Let set for 2-3 seconds\n"
            "4. Start stirring with spatula"
        ),
        points=20,
        time_limit_seconds=30.0,
        expected_objects=["pan", "bowl", "eggs"],
        expected_actions=["pour", "tilt"],
        prerequisites=["step-beat-eggs", "step-heat-pan"],
        skilldna_tags=["pouring", "timing"],
    )
    step4.evidence_requirements.append(EvidenceRequirement(
        evidence_type=EvidenceType.VIDEO,
        description="Video showing eggs being poured into pan",
        required_objects=["pan", "bowl"],
        required_actions=["pour"],
        verification_method=VerificationMethod.SEQUENCE,
        minimum_confidence=0.75,
    ))

    # Step 5: Cook and shape
    step5 = Step(
        step_id="step-cook-shape",
        order=4,
        name="Cook and Shape",
        description="Stir, fold, and shape the omelette",
        instructions=(
            "1. Stir eggs gently with spatula\n"
            "2. Tilt pan to spread eggs evenly\n"
            "3. When mostly set, fold omelette in thirds\n"
            "4. Cook for additional 15-30 seconds"
        ),
        points=25,
        time_limit_seconds=120.0,
        expected_objects=["pan", "spatula", "omelette"],
        expected_actions=["stir", "fold", "tilt", "shape"],
        expected_gestures=["folding_motion", "tilting_motion"],
        prerequisites=["step-pour-eggs"],
        skilldna_tags=["folding", "shaping", "technique"],
    )
    step5.evidence_requirements.append(EvidenceRequirement(
        evidence_type=EvidenceType.VIDEO,
        description="Video showing cooking and folding technique",
        required_objects=["pan", "spatula"],
        required_actions=["stir", "fold"],
        verification_method=VerificationMethod.ACTION,
        minimum_confidence=0.70,
    ))
    step5.skill_targets.append(SkillTarget(
        skill_id="skill-omelette-fold",
        skill_name="Omelette Folding",
        skill_category="cooking",
        weight=2.0,
        minimum_score=0.6,
        skilldna_tags=["folding", "technique"],
        mastery_contribution=0.2,
    ))

    # Step 6: Plate
    step6 = Step(
        step_id="step-plate",
        order=5,
        name="Plate",
        description="Transfer omelette to plate with proper presentation",
        instructions=(
            "1. Tilt pan towards warm plate\n"
            "2. Roll omelette onto plate\n"
            "3. Adjust shape if needed with spatula\n"
            "4. Garnish if desired"
        ),
        points=15,
        time_limit_seconds=30.0,
        expected_objects=["pan", "plate", "omelette"],
        expected_actions=["transfer", "roll", "place"],
        prerequisites=["step-cook-shape"],
        skilldna_tags=["plating", "presentation"],
    )
    step6.evidence_requirements.append(EvidenceRequirement(
        evidence_type=EvidenceType.PHOTO,
        description="Photo of final plated omelette",
        required_objects=["plate", "omelette"],
        verification_method=VerificationMethod.VISUAL,
        minimum_confidence=0.80,
    ))

    quest.steps = [step1, step2, step3, step4, step5, step6]
    return quest


def create_cable_management_quest() -> Quest:
    """
    Demo Quest: Cable Management

    Technical skill assessment for proper cable
    organization and labeling in server racks.
    """
    quest = Quest(
        quest_id="quest-cable-management",
        name="cable_management_basics",
        title="Server Rack Cable Management",
        description=(
            "Demonstrate proper cable management techniques in a server rack "
            "environment. This quest evaluates organization skills, labeling "
            "practices, and adherence to standards."
        ),
        category=QuestCategory.TECHNICAL,
        difficulty="intermediate",
        total_points=100,
        passing_score=75.0,
        time_limit_minutes=30.0,
        primary_skills=["cable_management", "organization", "labeling"],
        secondary_skills=["documentation", "safety", "standards_compliance"],
        required_equipment=[
            "cable_ties", "velcro_straps", "label_maker",
            "cable_tester", "cable_management_panel"
        ],
        required_materials=["network_cables", "labels", "cable_markers"],
        metadata=QuestMetadata(
            author="CyberHopeAI",
            version="1.0",
            tags=["technical", "networking", "data_center", "infrastructure"],
            keywords=["cables", "rack", "server", "organization"],
        ),
    )

    # Step 1: Identify cables
    step1 = Step(
        step_id="step-identify-cables",
        order=0,
        name="Identify Cables",
        description="Identify and categorize all cables to be managed",
        instructions=(
            "1. Survey the existing cable layout\n"
            "2. Categorize by type (power, network, fiber)\n"
            "3. Note source and destination of each cable\n"
            "4. Document current state"
        ),
        points=20,
        expected_objects=["cables", "rack", "clipboard"],
        expected_actions=["inspect", "trace", "document"],
        skilldna_tags=["identification", "documentation"],
    )
    step1.evidence_requirements.append(EvidenceRequirement(
        evidence_type=EvidenceType.VIDEO,
        description="Video showing cable identification process",
        required_objects=["cables", "hands"],
        required_actions=["trace", "point"],
        verification_method=VerificationMethod.VISUAL,
        minimum_confidence=0.70,
    ))

    # Step 2: Plan routing
    step2 = Step(
        step_id="step-plan-routing",
        order=1,
        name="Plan Routing",
        description="Plan optimal cable routing paths",
        instructions=(
            "1. Identify cable management panels and paths\n"
            "2. Group cables by destination\n"
            "3. Plan routing to minimize cable length\n"
            "4. Ensure airflow is not obstructed"
        ),
        points=15,
        prerequisites=["step-identify-cables"],
        expected_objects=["rack", "cable_panel"],
        expected_actions=["measure", "plan"],
        skilldna_tags=["planning", "routing"],
    )

    # Step 3: Route cables
    step3 = Step(
        step_id="step-route-cables",
        order=2,
        name="Route Cables",
        description="Route cables through management panels",
        instructions=(
            "1. Route cables through vertical management\n"
            "2. Use horizontal management at each U\n"
            "3. Maintain consistent bend radius\n"
            "4. Avoid stress on connectors"
        ),
        points=25,
        prerequisites=["step-plan-routing"],
        expected_objects=["cables", "cable_panel", "rack"],
        expected_actions=["route", "thread", "pull"],
        safety_critical=True,
        safety_notes=["Avoid excessive bending", "Don't stress connectors"],
        skilldna_tags=["routing", "technique"],
    )
    step3.evidence_requirements.append(EvidenceRequirement(
        evidence_type=EvidenceType.VIDEO,
        description="Video showing cable routing through panels",
        required_objects=["cables", "cable_panel"],
        required_actions=["route", "thread"],
        verification_method=VerificationMethod.ACTION,
        minimum_confidence=0.70,
    ))

    # Step 4: Secure cables
    step4 = Step(
        step_id="step-secure-cables",
        order=3,
        name="Secure Cables",
        description="Secure cables with appropriate fasteners",
        instructions=(
            "1. Bundle related cables together\n"
            "2. Use velcro straps for bundles (reusable)\n"
            "3. Ensure bundles aren't too tight\n"
            "4. Leave service loops where needed"
        ),
        points=20,
        prerequisites=["step-route-cables"],
        expected_objects=["cables", "velcro_straps", "cable_ties"],
        expected_actions=["bundle", "wrap", "secure"],
        skilldna_tags=["bundling", "securing"],
    )
    step4.evidence_requirements.append(EvidenceRequirement(
        evidence_type=EvidenceType.VIDEO,
        description="Video showing cable bundling and securing",
        required_objects=["cables", "velcro_straps"],
        required_actions=["bundle", "wrap"],
        verification_method=VerificationMethod.ACTION,
        minimum_confidence=0.70,
    ))

    # Step 5: Label cables
    step5 = Step(
        step_id="step-label-cables",
        order=4,
        name="Label Cables",
        description="Apply clear labels to all cables",
        instructions=(
            "1. Create labels with source/destination\n"
            "2. Apply labels at both ends\n"
            "3. Use consistent naming convention\n"
            "4. Ensure labels are readable"
        ),
        points=20,
        prerequisites=["step-secure-cables"],
        expected_objects=["labels", "label_maker", "cables"],
        expected_actions=["print", "apply", "attach"],
        skilldna_tags=["labeling", "documentation"],
    )
    step5.evidence_requirements.append(EvidenceRequirement(
        evidence_type=EvidenceType.PHOTO,
        description="Photo showing labeled cable ends",
        required_objects=["labels", "cables"],
        verification_method=VerificationMethod.VISUAL,
        minimum_confidence=0.80,
    ))

    quest.steps = [step1, step2, step3, step4, step5]
    return quest


def create_safety_inspection_quest() -> Quest:
    """
    Demo Quest: Safety Inspection

    Safety compliance quest for workplace hazard identification.
    """
    quest = Quest(
        quest_id="quest-safety-inspection",
        name="workplace_safety_inspection",
        title="Workplace Safety Inspection",
        description=(
            "Conduct a thorough safety inspection of a workspace. "
            "Identify hazards, verify safety equipment, and document findings."
        ),
        category=QuestCategory.SAFETY,
        difficulty="intermediate",
        total_points=100,
        passing_score=80.0,
        time_limit_minutes=45.0,
        primary_skills=["safety_inspection", "hazard_identification", "documentation"],
        secondary_skills=["compliance", "communication", "attention_to_detail"],
        required_equipment=["clipboard", "camera", "flashlight", "ppe"],
        metadata=QuestMetadata(
            author="CyberHopeAI",
            version="1.0",
            tags=["safety", "inspection", "compliance", "workplace"],
            keywords=["hazard", "osha", "safety", "inspection"],
        ),
    )

    # Step 1: PPE Check
    step1 = Step(
        step_id="step-ppe-check",
        order=0,
        name="PPE Check",
        description="Verify proper personal protective equipment",
        instructions=(
            "1. Don required PPE for inspection\n"
            "2. Verify hard hat, safety glasses, gloves\n"
            "3. Ensure high-visibility vest if required\n"
            "4. Check steel-toe boots"
        ),
        points=15,
        expected_objects=["hard_hat", "safety_glasses", "gloves", "vest"],
        expected_actions=["wear", "check", "inspect"],
        safety_critical=True,
        skilldna_tags=["ppe", "preparation"],
    )
    step1.evidence_requirements.append(EvidenceRequirement(
        evidence_type=EvidenceType.VIDEO,
        description="Video showing PPE donning",
        required_objects=["hard_hat", "safety_glasses"],
        verification_method=VerificationMethod.OBJECT,
        minimum_confidence=0.80,
    ))

    # Step 2: Exit route inspection
    step2 = Step(
        step_id="step-exit-routes",
        order=1,
        name="Exit Routes",
        description="Verify emergency exit routes are clear",
        instructions=(
            "1. Walk all emergency exit paths\n"
            "2. Verify exits are clearly marked\n"
            "3. Check exit lights are functional\n"
            "4. Ensure no obstructions"
        ),
        points=20,
        prerequisites=["step-ppe-check"],
        expected_objects=["exit_sign", "door", "pathway"],
        expected_actions=["walk", "inspect", "check"],
        safety_critical=True,
        skilldna_tags=["exit_routes", "emergency_preparedness"],
    )

    # Step 3: Fire equipment
    step3 = Step(
        step_id="step-fire-equipment",
        order=2,
        name="Fire Equipment",
        description="Inspect fire extinguishers and alarms",
        instructions=(
            "1. Locate all fire extinguishers\n"
            "2. Check pressure gauges\n"
            "3. Verify inspection tags are current\n"
            "4. Test fire alarm (if authorized)"
        ),
        points=25,
        prerequisites=["step-exit-routes"],
        expected_objects=["fire_extinguisher", "alarm_pull", "inspection_tag"],
        expected_actions=["locate", "inspect", "verify"],
        safety_critical=True,
        skilldna_tags=["fire_safety", "equipment_inspection"],
    )
    step3.evidence_requirements.append(EvidenceRequirement(
        evidence_type=EvidenceType.PHOTO,
        description="Photo of fire extinguisher with inspection tag",
        required_objects=["fire_extinguisher", "inspection_tag"],
        verification_method=VerificationMethod.VISUAL,
        minimum_confidence=0.85,
    ))

    # Step 4: Hazard identification
    step4 = Step(
        step_id="step-hazard-id",
        order=3,
        name="Hazard Identification",
        description="Identify and document workplace hazards",
        instructions=(
            "1. Survey workspace for potential hazards\n"
            "2. Check for trip hazards (cords, debris)\n"
            "3. Identify chemical storage issues\n"
            "4. Note electrical hazards\n"
            "5. Document all findings"
        ),
        points=25,
        prerequisites=["step-fire-equipment"],
        expected_objects=["clipboard", "workspace"],
        expected_actions=["survey", "identify", "document"],
        skilldna_tags=["hazard_identification", "observation"],
    )
    step4.evidence_requirements.append(EvidenceRequirement(
        evidence_type=EvidenceType.VIDEO,
        description="Video walkthrough identifying hazards",
        required_objects=["workspace"],
        required_actions=["point", "document"],
        required_audio=["verbal_identification"],
        verification_method=VerificationMethod.AUDIO,
        minimum_confidence=0.70,
    ))

    # Step 5: Report
    step5 = Step(
        step_id="step-report",
        order=4,
        name="Report Findings",
        description="Complete and submit inspection report",
        instructions=(
            "1. Compile all findings\n"
            "2. Categorize by severity\n"
            "3. Recommend corrective actions\n"
            "4. Submit report to supervisor"
        ),
        points=15,
        prerequisites=["step-hazard-id"],
        expected_objects=["clipboard", "report_form"],
        expected_actions=["write", "compile", "submit"],
        skilldna_tags=["documentation", "reporting"],
    )
    step5.evidence_requirements.append(EvidenceRequirement(
        evidence_type=EvidenceType.DOCUMENT,
        description="Completed inspection report document",
        verification_method=VerificationMethod.MANUAL,
        minimum_confidence=0.90,
    ))

    quest.steps = [step1, step2, step3, step4, step5]
    return quest


def load_sample_quests() -> QuestLibrary:
    """Load all sample quests into a library."""
    library = get_quest_library()

    # Create and add all sample quests
    sample_quests = [
        create_omelette_quest(),
        create_cable_management_quest(),
        create_safety_inspection_quest(),
    ]

    for quest in sample_quests:
        try:
            library.add_quest(quest)
            print(f"✓ Loaded quest: {quest.title}")
        except Exception as e:
            print(f"✗ Failed to load {quest.name}: {e}")

    return library


def get_sample_quest_ids() -> list:
    """Get list of sample quest IDs."""
    return [
        "quest-omelette-basic",
        "quest-cable-management",
        "quest-safety-inspection",
    ]
