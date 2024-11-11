import { getSchema } from '../../../utils/get-schema.js';
import { RolesService } from '../../../services/roles.js';
import { PoliciesService } from '../../../services/index.js';
import { AccessService } from '../../../services/index.js';
import getDatabase from '../../../database/index.js';
import { useLogger } from '../../../logger/index.js';

export default async function rolesCreate({ role: name, admin }: { role: string; admin: boolean }): Promise<void> {
	const database = getDatabase();
	const logger = useLogger();

	if (!name) {
		logger.error('Name is required');
		process.exit(1);
	}

	try {
		const schema = await getSchema();
		const rolesService = new RolesService({ schema: schema, knex: database });
		const policiesService = new PoliciesService({ schema: schema, knex: database });
		const accessService = new AccessService({ schema: schema, knex: database });

		const adminPolicyId = await policiesService.knex
			.select('id')
			.from('directus_policies')
			.where('admin_access', true)
			.first();

		if (admin && !adminPolicyId) {
			logger.error('Cannot create an admin role without an admin policy');
			database.destroy();
			process.exit(1);
		}

		const roleId = await rolesService.createOne({ name });

		if (admin) {
			await accessService.createOne({
				role: roleId,
				policy: adminPolicyId.id,
			});
		}

		process.stdout.write(`${String(roleId)}\n`);
		database.destroy();
		process.exit(0);
	} catch (err: any) {
		logger.error(err);
		process.exit(1);
	}
}
