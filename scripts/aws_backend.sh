#!/usr/bin/env bash
set -euo pipefail

AWS_PROFILE_NAME="${AWS_PROFILE:-company-brain}"
AWS_REGION="${AWS_REGION:-eu-central-1}"
CLUSTER_NAME="${COMPANY_BRAIN_ECS_CLUSTER:-company-brain-graphrag}"
SERVICE_NAME="${COMPANY_BRAIN_ECS_SERVICE:-company-brain-graphrag-backend}"
AWS_CLI="${AWS_CLI:-.venv/bin/python -m awscli}"

aws_cmd() {
  local attempt
  for attempt in 1 2 3; do
    if AWS_PROFILE="$AWS_PROFILE_NAME" AWS_DEFAULT_REGION="$AWS_REGION" \
      $AWS_CLI --region "$AWS_REGION" --cli-connect-timeout 10 --cli-read-timeout 20 "$@"; then
      return 0
    fi

    if [[ "$attempt" == "3" ]]; then
      return 1
    fi
    sleep 2
  done
}

running_task() {
  aws_cmd ecs list-tasks \
    --cluster "$CLUSTER_NAME" \
    --service-name "$SERVICE_NAME" \
    --desired-status RUNNING \
    --query 'taskArns[0]' \
    --output text
}

public_ip() {
  local task_arn
  task_arn="$(running_task)"
  if [[ -z "$task_arn" || "$task_arn" == "None" ]]; then
    echo "No running backend task." >&2
    return 1
  fi

  local eni
  eni="$(aws_cmd ecs describe-tasks \
    --cluster "$CLUSTER_NAME" \
    --tasks "$task_arn" \
    --query 'tasks[0].attachments[0].details[?name==`networkInterfaceId`].value | [0]' \
    --output text)"

  aws_cmd ec2 describe-network-interfaces \
    --network-interface-ids "$eni" \
    --query 'NetworkInterfaces[0].Association.PublicIp' \
    --output text
}

case "${1:-status}" in
  status)
    aws_cmd ecs describe-services \
      --cluster "$CLUSTER_NAME" \
      --services "$SERVICE_NAME" \
      --query 'services[0].{Status:status,Desired:desiredCount,Running:runningCount,Pending:pendingCount,TaskDefinition:taskDefinition}' \
      --output json
    ;;
  start)
    aws_cmd ecs update-service \
      --cluster "$CLUSTER_NAME" \
      --service "$SERVICE_NAME" \
      --desired-count 1 \
      --query 'service.{Desired:desiredCount,Running:runningCount,Service:serviceName}' \
      --output json
    aws_cmd ecs wait services-stable --cluster "$CLUSTER_NAME" --services "$SERVICE_NAME"
    ip="$(public_ip)"
    echo "Backend URL: http://$ip:8000"
    ;;
  stop)
    aws_cmd ecs update-service \
      --cluster "$CLUSTER_NAME" \
      --service "$SERVICE_NAME" \
      --desired-count 0 \
      --query 'service.{Desired:desiredCount,Running:runningCount,Service:serviceName}' \
      --output json
    ;;
  url)
    ip="$(public_ip)"
    echo "http://$ip:8000"
    ;;
  health)
    ip="$(public_ip)"
    curl -sS "http://$ip:8000/health"
    echo
    ;;
  *)
    echo "Usage: $0 [status|start|stop|url|health]" >&2
    exit 2
    ;;
esac
